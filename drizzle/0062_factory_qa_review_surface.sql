ALTER TABLE `v7_evaluation_factory_qa_receipts` ADD COLUMN `review_input_hash` text CHECK (`review_input_hash` IS NULL OR length(`review_input_hash`) = 64);
--> statement-breakpoint
ALTER TABLE `v7_evaluation_factory_qa_receipts` ADD COLUMN `review_mime_type` text;
--> statement-breakpoint
ALTER TABLE `v7_evaluation_factory_qa_receipts` ADD COLUMN `review_transform` text CHECK (`review_transform` IS NULL OR `review_transform` IN ('IDENTITY','SVG_TO_PNG_1920X1080_V1'));
