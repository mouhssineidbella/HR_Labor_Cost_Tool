<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login'], // Zidna login hna
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173'], // Ghir l-Frontend dyalk
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, // Redha true darouri bach y-khdem s-sarout (Token)
];