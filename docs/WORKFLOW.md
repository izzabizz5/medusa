# Medusa Application Workflow

## Overview

Medusa is a web application designed to protect athletes from non-consensual intimate image abuse. An administrator creates profiles for athletes, uploads their reference photos, and the system continuously scans known exploitative websites to detect unauthorized images using facial recognition technology. When a match is found, the system facilitates takedown requests through either direct platform reporting or formal DMCA notices.

## System Architecture

The application is built as a microservices architecture consisting of six services, a shared PostgreSQL database, and a Redis message queue. All application services run on Oracle Cloud's free-tier Kubernetes cluster. The facial recognition model runs on a Vultr GPU instance that is started on-demand and halted when idle to minimize cost.

**Frontend (Port 3000)** — A Next.js web application providing the admin dashboard, profile management, and match review interface.

**Backend API (Port 4000)** — A NestJS REST API handling authentication, session management, file uploads, admin operations, and pipeline orchestration. Uses Redis-backed session cookies for secure authentication.

**Link Management Service (Port 4002)** — Manages the database of target URLs to monitor. Handles keyword-based URL discovery via DuckDuckGo searches and URL classification using a machine learning model.

**Crawling Service (Port 4001)** — Uses Playwright headless browsers with residential proxy rotation to visit target web pages, extract images, and download them for scanning. Filters out non-photo assets such as icons, stylesheets, and tracking pixels.

**Scanning Service (Port 4004)** — Runs a Python FastAPI sidecar alongside a NestJS host. The Python process loads the InsightFace library to perform face detection, alignment, and embedding extraction using the ArcFace model.

**Matching Service (Port 4003)** — Compares face embeddings from scanned images against reference photo embeddings using cosine similarity. Creates match records when similarity exceeds the configured threshold.

**Shared Infrastructure** — PostgreSQL stores all application data. Redis provides the BullMQ job queue for asynchronous processing across services. Oracle Object Storage holds uploaded reference photos and downloaded found images.

## Pipeline Workflow

### Phase 1: Profile Creation and Reference Photo Upload

The administrator logs into the web application using the designated admin email account. The system automatically promotes this account to the admin role on login.

From the Profiles page, the administrator creates a managed profile for an athlete by entering their full name and sport. An email address is optional; if omitted, the system generates an internal placeholder. No password is required because the administrator accesses managed profiles through session impersonation rather than direct login.

The administrator switches into the athlete's profile using the impersonation feature. The session now operates as if the athlete is logged in, while the real admin identity is preserved in the session for easy exit. An amber banner across the top of the interface indicates that impersonation is active.

While impersonating the athlete, the administrator navigates to the Photos page and uploads clear, front-facing reference photos. Each uploaded photo is saved to object storage and a background job is queued for face embedding extraction.

The scanning service processes each reference photo through the following pipeline:

1. The image is loaded and downscaled if it exceeds 1280 pixels on its longest side.
2. The RetinaFace detection model identifies all faces in the image, producing bounding boxes, five-point facial landmarks, and confidence scores.
3. Faces smaller than 40 pixels or with a detection confidence below 0.5 are discarded.
4. The largest qualifying face is selected as the primary subject.
5. An affine transformation based on the five facial landmarks warps and crops the face into a normalized 112 by 112 pixel image.
6. The ArcFace recognition model (w600k_r50) processes the aligned crop and produces a 512-dimensional embedding vector.
7. The vector is L2-normalized to unit length, which is required for accurate cosine similarity comparisons.

The resulting embedding is stored in the face_embeddings table with a source type of "reference" and linked back to the reference photo record. The photo's status is updated to "embedded."

### Phase 2: Keyword Discovery

The administrator navigates to the Pipeline page and clicks the Discover URLs button. The system builds targeted search queries by combining each athlete profile's name and sport with each known creeper site domain.

For a profile named "Ashley Maul" with the sport "volleyball" and 50 known target domains, the system generates queries such as:

- "Ashley Maul" volleyball
- "Ashley Maul" volleyball leaked
- "Ashley Maul" volleyball nude
- "Ashley Maul" volleyball site:reddit.com
- "Ashley Maul" volleyball site:erome.com
- "Ashley Maul" volleyball site:ncaapeaches.com

Each query is queued as a discovery job. The link management service processes each job by submitting the query to DuckDuckGo's HTML search interface, which does not require an API key. The service parses the search results to extract destination URLs from DuckDuckGo's redirect parameters.

The extracted URLs are filtered to reject non-page resources such as stylesheets, scripts, images, fonts, and CDN assets. Only URLs pointing to actual web pages are retained.

Each qualifying URL is then scored by the URL classifier, a machine learning model that estimates how likely the URL is to contain exploitative content. URLs scoring above 0.70 are automatically activated for crawling. URLs scoring between 0.45 and 0.70 are added in an inactive state pending human review. URLs scoring below 0.45 are discarded.

### Phase 3: URL Review

The administrator opens the URL Ranking page and selects the Pending tab to review discovered URLs. Each URL is displayed with its machine learning confidence score, platform classification, and action buttons.

The administrator approves URLs that appear to be relevant pages containing athlete content. Approved URLs are marked as active and labeled as positive training data. Rejected URLs are deactivated and labeled as negative training data, which improves the classifier's accuracy over time.

The administrator can also manually add URLs, set crawl priority using a five-star ranking system, and trigger additional discovery jobs from this page.

### Phase 4: Targeted Crawl

The administrator returns to the Pipeline page and clicks the Run Crawl button. The system queues crawl jobs only for pages that were discovered through keyword search, not for the root homepages of creeper sites. This ensures that only pages likely to contain the target athlete's images are visited.

The crawling service processes each job by launching a headless Playwright browser instance. If configured, the browser routes traffic through a SmartProxy residential proxy to bypass bot detection mechanisms on target sites.

The browser navigates to the target page, waits for content to load, and scrolls to trigger lazy-loaded images. The image extractor then parses the page content to identify image URLs from three sources: Open Graph meta tags, standard image elements, and srcset attributes.

Strict filtering ensures only real photographs are collected:

- Only JPEG, PNG, and WebP formats are accepted. SVG, ICO, GIF, and BMP files are rejected.
- Images must be at least 150 pixels in both dimensions. This eliminates icons, spacers, tracking pixels, and thumbnails.
- URLs containing patterns associated with site assets are rejected, including paths containing "favicon," "icon," "logo," "sprite," "static," "assets," "css," or "fonts."
- Known advertising and analytics domains are filtered out.

Each qualifying image URL is checked against the found_images table using a URL hash to prevent duplicate downloads. New images are downloaded in parallel batches of ten and saved to object storage. A scan job is queued for each new image.

### Phase 5: Face Scanning

The scanning service processes each scan job by first checking whether the image has already been scanned. Images with a status of "embedded" or "no_face" are skipped immediately, preventing redundant work after service restarts or job retries.

For unprocessed images, the service sends the image to the Python sidecar for face analysis. The sidecar follows the same detection, alignment, and embedding pipeline described in Phase 1:

1. Image downscaling to a maximum of 1280 pixels.
2. RetinaFace face detection with bounding boxes, landmarks, and confidence scores.
3. Quality filtering to remove small or low-confidence detections.
4. Landmark-based affine alignment producing a normalized 112 by 112 pixel crop.
5. ArcFace embedding extraction producing a 512-dimensional vector.
6. L2 normalization to unit length.

If a face is detected and an embedding is successfully generated, it is stored in the face_embeddings table with a source type of "found" and linked to the found_image record. If no qualifying face is detected, the image is marked as "no_face" and will not be processed again.

### Phase 6: Face Matching

The administrator clicks the Run Match button on the Pipeline page. The matching service loads all reference embeddings from the database, joining the face_embeddings table with reference_photos that have a status of "embedded."

Found image embeddings are loaded in chunks of 1000 to manage memory usage. For each found embedding, the service computes the cosine similarity against every reference embedding:

Cosine Similarity = dot(a, b) / (magnitude(a) times magnitude(b))

A similarity score of 1.0 indicates identical faces. A score of 0.0 indicates no resemblance. The system uses a threshold of 0.40 to identify candidate matches.

When a candidate match is found, the service checks whether this specific reference-photo-to-found-image pair has already been recorded. If not, a new match record is created with the user ID, reference photo ID, found image ID, similarity score, and a status of "pending_review."

### Phase 7: Match Review and Takedown

The athlete's match results appear on the Matches page in the dashboard. Each match displays the found image location, the similarity score as a percentage, and options to confirm or reject the match.

When a match is confirmed, the user can request a takedown through one of two mechanisms:

**Platform Takedown** — Files a report through the hosting site's own abuse reporting system. This is the fastest path for sites that have established content moderation processes.

**DMCA Notice** — Generates a formal Digital Millennium Copyright Act takedown notice. This carries legal weight and compels the hosting provider to remove the content.

Takedown requests enter the admin review queue, where the administrator can add notes, approve the request for filing, or reject it if the match was incorrect.

## Database Schema

The application uses the following primary tables:

**users** — Stores athlete profiles including name, sport, email, role, and authentication data. Managed profiles have randomly generated passwords and are accessed only through admin impersonation.

**reference_photos** — Tracks uploaded reference images with their storage keys, processing status (pending, processing, embedded, or failed), and links to generated face embeddings.

**target_urls** — Contains both manually added creeper site domains and auto-discovered page URLs. Stores platform classification, active status, machine learning scores, human labels, and crawl priority.

**crawl_runs** — Records the history of each crawl job including the target URL, number of images found and newly added, completion status, and any error messages.

**found_images** — Stores metadata for every downloaded image including the source URL, page URL, storage key, URL hash for deduplication, scan status, and perceptual hash.

**face_embeddings** — Contains 512-dimensional embedding vectors stored as JSONB arrays, with a source type distinguishing reference embeddings from found image embeddings, and the model name used for generation.

**matches** — Records confirmed face matches linking a user, reference photo, and found image with the computed similarity score and review status.

**takedown_requests** — Tracks the lifecycle of takedown actions including the request type, associated match, admin review status, and filing history.

## Cost Structure

The application runs on a combination of Oracle Cloud free-tier infrastructure and a pay-per-use Vultr GPU instance.

Oracle Cloud hosts all six application services on a two-node Kubernetes cluster with four ARM OCPUs and 24 gigabytes of RAM at no cost. One hundred gigabytes of block storage for the PostgreSQL database and Redis are also free. Two hundred gigabytes of object storage for photos costs four dollars and eighty-five cents per month.

The Vultr GPU instance uses a one-seventh slice of an NVIDIA A100 with ten gigabytes of VRAM at a rate of thirty-four cents per hour. The GPU orchestrator automatically starts the instance when scan jobs are queued and halts it when the queue is empty, limiting usage to ten to thirty minutes per day. This results in a monthly GPU cost of approximately one dollar and seventy-one cents to five dollars and thirteen cents.

SmartProxy residential proxies for bypassing bot detection on target websites cost nine dollars per month. The mymedusa.org domain through Cloudflare costs seven dollars and fifty cents per year, or approximately sixty-three cents per month.

The total monthly operating cost ranges from approximately sixteen dollars to twenty-three dollars depending on GPU usage intensity.
