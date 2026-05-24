ALTER TABLE `user_plans` RENAME COLUMN `stripe_customer_id` TO `ls_customer_id`;
--> statement-breakpoint
ALTER TABLE `user_plans` RENAME COLUMN `stripe_subscription_id` TO `ls_subscription_id`;
--> statement-breakpoint
ALTER TABLE `user_plans` RENAME COLUMN `invoices_this_month` TO `usage_this_month`;
