<?php
// Review system settings. EDIT THIS FILE after uploading to your hosting.
return [
    // Choose a long private phrase. You type the same phrase in Admin > Reviews to approve/hide reviews.
    // Until you change it, approving/hiding/deleting is switched OFF for safety.
    'admin_token'  => 'CHANGE-ME-to-a-long-private-phrase',

    // New reviews are emailed here so you know to approve them (leave '' to disable).
    'notify_email' => 'patrickkafathe@gmail.com',

    // Max reviews one visitor can submit per hour.
    'max_per_hour' => 3,
];
