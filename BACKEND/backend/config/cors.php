<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login'], // Zidna login hna
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // Dev: Allow all origins (5173, 5174, etc.)
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, // Redha true darouri bach y-khdem s-sarout (Token)
];