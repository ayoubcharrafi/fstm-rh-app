<?php

namespace App\Services;

use App\Models\DocumentRequest;
use App\Models\RequestFile;

interface DocumentGeneratorInterface
{
    /**
     * Generate a PDF for the given request using the active template.
     * Stores the file and returns the RequestFile record.
     */
    public function generate(DocumentRequest $request): RequestFile;
}
