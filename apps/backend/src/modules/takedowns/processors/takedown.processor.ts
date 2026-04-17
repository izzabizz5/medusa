import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TakedownRequest, TakedownEvent, TakedownStatus } from '../../../entities/takedown-request.entity';
import { FoundImage } from '../../../entities/found-image.entity';
import { Match } from '../../../entities/match.entity';
import { User } from '../../../entities/user.entity';
import { QUEUES, JOBS, TakedownJobPayload } from '@medusa/shared';

@Processor(QUEUES.TAKEDOWN)
export class TakedownProcessor extends WorkerHost {
  private readonly logger = new Logger(TakedownProcessor.name);
  private readonly mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(TakedownRequest)
    private readonly takedownRepo: Repository<TakedownRequest>,
    @InjectRepository(TakedownEvent)
    private readonly eventRepo: Repository<TakedownEvent>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(FoundImage)
    private readonly foundImageRepo: Repository<FoundImage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {
    super();
    this.mailer = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: parseInt(config.get('SMTP_PORT', '587')),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASSWORD'),
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async process(job: any): Promise<any> {
    const name: string = job.name;
    const data: TakedownJobPayload = job.data;
    this.logger.log(`Processing takedown job ${name} for request ${data.takedownRequestId}`);

    if (name === JOBS.FILE_DMCA_NOTICE) {
      await this.fileDmcaNotice(data);
    } else if (name === JOBS.FILE_PLATFORM_TAKEDOWN) {
      await this.filePlatformTakedown(data);
    }
  }

  private async fileDmcaNotice(data: TakedownJobPayload) {
    const takedown = await this.takedownRepo.findOne({
      where: { id: data.takedownRequestId },
      relations: ['match', 'match.foundImage'],
    });
    const user = await this.userRepo.findOne({ where: { id: data.userId } });

    const foundImage = takedown.match.foundImage;
    const hostDomain = this.extractDomain(foundImage.imageUrl);
    const dmcaEmail = `dmca@${hostDomain}`;

    const subject = `DMCA Takedown Notice - Unauthorized Use of Copyrighted Image`;
    const body = this.buildDmcaEmailBody(user, foundImage.imageUrl, foundImage.pageUrl);

    try {
      await this.mailer.sendMail({
        from: this.config.get('EMAIL_FROM'),
        to: dmcaEmail,
        cc: user.email,
        subject,
        text: body,
      });

      await this.updateTakedownStatus(takedown.id, TakedownStatus.FILED, 'DMCA email sent to ' + dmcaEmail);
      this.logger.log(`DMCA notice filed for takedown ${takedown.id}`);
    } catch (err) {
      this.logger.error(`Failed to send DMCA email: ${err.message}`);
      await this.updateTakedownStatus(takedown.id, TakedownStatus.FAILED, err.message);
      throw err;
    }
  }

  private async filePlatformTakedown(data: TakedownJobPayload) {
    const takedown = await this.takedownRepo.findOne({
      where: { id: data.takedownRequestId },
      relations: ['match', 'match.foundImage'],
    });
    const foundImage = takedown.match.foundImage;

    // Platform-specific reporting URLs
    const reportUrl = this.getPlatformReportUrl(data.platform, foundImage.pageUrl);

    // Log the report URL — in production this can be automated with Playwright
    // or submitted via the platform's API. For now we record it for manual follow-up.
    const notes = `Platform report URL generated: ${reportUrl}. Manual filing required or automated via Playwright.`;

    await this.updateTakedownStatus(takedown.id, TakedownStatus.FILED, notes);
    this.logger.log(`Platform takedown filed for ${takedown.id}: ${reportUrl}`);
  }

  private async updateTakedownStatus(
    id: string,
    status: TakedownStatus,
    notes: string,
  ) {
    await this.takedownRepo.update(id, {
      status,
      filedAt: status === TakedownStatus.FILED ? new Date() : undefined,
    });
    await this.eventRepo.save(
      this.eventRepo.create({
        takedownRequestId: id,
        eventType: status,
        notes,
      }),
    );
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown.com';
    }
  }

  private getPlatformReportUrl(platform: string, pageUrl: string): string {
    const encoded = encodeURIComponent(pageUrl || '');
    const reportUrls: Record<string, string> = {
      reddit: `https://www.reddit.com/report?url=${encoded}`,
      pinterest: `https://www.pinterest.com/about/copyright/dmca-pin/?url=${encoded}`,
      instagram: `https://help.instagram.com/contact/372592039493026`,
    };
    return reportUrls[platform] || `https://www.lumendatabase.org/notices/new?url=${encoded}`;
  }

  private buildDmcaEmailBody(user: User, imageUrl: string, pageUrl: string): string {
    return `
DMCA TAKEDOWN NOTICE

To Whom It May Concern,

I am writing to notify you of copyright infringement occurring on your platform.

COPYRIGHT OWNER: ${user.fullName || user.email}
CONTACT: ${user.email}

INFRINGING CONTENT:
- Image URL: ${imageUrl}
- Page URL: ${pageUrl || 'N/A'}

I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

The information in this notification is accurate, and I swear under penalty of perjury that I am the copyright owner or am authorized to act on behalf of the owner.

I request that you immediately remove or disable access to the infringing material listed above.

Sincerely,
${user.fullName || user.email}
    `.trim();
  }
}
