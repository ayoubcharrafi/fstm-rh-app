<?php

namespace App\Services;

/**
 * Générateur XLSX minimal en PHP pur — construit l'archive ZIP à la main
 * (en-têtes local + central directory, compression DEFLATE via zlib) afin de
 * NE PAS dépendre de l'extension ZipArchive, absente du conteneur.
 *
 * Produit un classeur mono-feuille à partir d'un tableau de lignes (chaînes).
 * Toutes les cellules sont écrites en texte (inlineStr) pour éviter toute
 * réinterprétation de type par Excel (matricules, IP, dates lisibles…).
 */
class XlsxWriter
{
    /** @var array<int, array<int, string>> */
    private array $rows = [];

    /**
     * @param array<int, string> $row
     */
    public function addRow(array $row): void
    {
        $this->rows[] = array_values(array_map(static fn ($v) => (string) $v, $row));
    }

    /**
     * Retourne le contenu binaire complet du fichier .xlsx.
     */
    public function build(): string
    {
        $files = [
            '[Content_Types].xml' => $this->contentTypes(),
            '_rels/.rels'         => $this->rootRels(),
            'xl/workbook.xml'     => $this->workbook(),
            'xl/_rels/workbook.xml.rels' => $this->workbookRels(),
            'xl/worksheets/sheet1.xml'   => $this->sheet(),
        ];

        return $this->zip($files);
    }

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '</Types>';
    }

    private function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Journal" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function workbookRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>';
    }

    private function sheet(): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';

        foreach ($this->rows as $r => $cells) {
            $rowNum = $r + 1;
            $xml .= '<row r="'.$rowNum.'">';
            foreach ($cells as $c => $value) {
                $ref = $this->colLetter($c).$rowNum;
                $xml .= '<c r="'.$ref.'" t="inlineStr"><is><t xml:space="preserve">'
                    . htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8')
                    . '</t></is></c>';
            }
            $xml .= '</row>';
        }

        $xml .= '</sheetData></worksheet>';

        return $xml;
    }

    private function colLetter(int $index): string
    {
        $letter = '';
        $index++;
        while ($index > 0) {
            $mod = ($index - 1) % 26;
            $letter = chr(65 + $mod).$letter;
            $index = intdiv($index - 1, 26);
        }

        return $letter;
    }

    /**
     * Construit un conteneur ZIP (méthode DEFLATE) sans ZipArchive.
     *
     * @param array<string, string> $files nom d'entrée => contenu
     */
    private function zip(array $files): string
    {
        $local = '';
        $central = '';
        $offset = 0;

        foreach ($files as $name => $content) {
            $crc = crc32($content);
            $uncompressed = strlen($content);
            $deflated = gzdeflate($content, 6);
            if ($deflated === false) {
                // repli : stockage sans compression
                $deflated = $content;
                $method = 0;
                $compressed = $uncompressed;
            } else {
                $method = 8;
                $compressed = strlen($deflated);
            }

            $nameLen = strlen($name);

            // En-tête de fichier local
            $localHeader = "\x50\x4b\x03\x04"          // signature
                . pack('v', 20)                        // version needed
                . pack('v', 0)                         // flags
                . pack('v', $method)                   // méthode de compression
                . pack('v', 0)                         // heure (0)
                . pack('v', 0)                         // date (0)
                . pack('V', $crc)                      // crc32
                . pack('V', $compressed)               // taille compressée
                . pack('V', $uncompressed)             // taille non compressée
                . pack('v', $nameLen)                  // longueur du nom
                . pack('v', 0)                         // longueur extra
                . $name;

            $local .= $localHeader.$deflated;

            // Entrée du central directory
            $central .= "\x50\x4b\x01\x02"             // signature
                . pack('v', 20)                        // version made by
                . pack('v', 20)                        // version needed
                . pack('v', 0)                         // flags
                . pack('v', $method)
                . pack('v', 0)                         // heure
                . pack('v', 0)                         // date
                . pack('V', $crc)
                . pack('V', $compressed)
                . pack('V', $uncompressed)
                . pack('v', $nameLen)
                . pack('v', 0)                         // extra
                . pack('v', 0)                         // commentaire
                . pack('v', 0)                         // disk number
                . pack('v', 0)                         // internal attrs
                . pack('V', 0)                         // external attrs
                . pack('V', $offset)                   // offset de l'en-tête local
                . $name;

            $offset += strlen($localHeader) + strlen($deflated);
        }

        $centralSize = strlen($central);
        $centralOffset = strlen($local);
        $count = count($files);

        $eocd = "\x50\x4b\x05\x06"                     // signature End Of Central Directory
            . pack('v', 0)                             // disk number
            . pack('v', 0)                             // disk with central dir
            . pack('v', $count)                        // entrées sur ce disque
            . pack('v', $count)                        // total entrées
            . pack('V', $centralSize)                  // taille central dir
            . pack('V', $centralOffset)                // offset central dir
            . pack('v', 0);                            // longueur commentaire

        return $local.$central.$eocd;
    }
}
