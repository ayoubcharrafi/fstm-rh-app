<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $titre }}</title>
</head>
{{-- Styles en ligne : les clients de messagerie ignorent les feuilles externes. --}}
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

                    <tr>
                        <td style="background-color:#1d4ed8;padding:24px 32px;">
                            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">FST Mohammedia</p>
                            <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Gestion des ressources humaines</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#111827;font-size:16px;">
                                Bonjour{{ $prenom ? ' ' . $prenom : '' }},
                            </p>

                            <p style="margin:0 0 8px;color:#111827;font-size:17px;font-weight:bold;">
                                {{ $titre }}
                            </p>

                            <p style="margin:0;color:#374151;font-size:14px;line-height:22px;">
                                {{ $contenu }}
                            </p>

                            @if ($lien)
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
                                    <tr>
                                        <td style="background-color:#1d4ed8;border-radius:8px;">
                                            <a href="{{ $lien }}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">
                                                Consulter sur la plateforme
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            @endif
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
                            <p style="margin:0;color:#6b7280;font-size:12px;line-height:18px;">
                                Message automatique, merci de ne pas y répondre.<br>
                                Pour ne plus recevoir ces e-mails, rendez-vous dans Paramètres &rsaquo; Notifications.<br>
                                Faculté des Sciences et Techniques de Mohammedia
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
