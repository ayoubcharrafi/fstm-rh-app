<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nouveau mot de passe</title>
</head>
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

                            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:22px;">
                                L'administration a réinitialisé votre mot de passe.
                            </p>

                            <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:22px;">
                                Voici votre nouveau mot de passe :
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;">
                                        <span style="color:#1d4ed8;font-size:24px;font-weight:bold;letter-spacing:1px;font-family:'Courier New',monospace;">{{ $password }}</span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 0;color:#374151;font-size:14px;line-height:22px;">
                                Connectez-vous avec ce mot de passe, puis changez-le immédiatement pour garantir la sécurité de votre compte.
                            </p>

                            <p style="margin:20px 0 0;padding:14px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px;line-height:20px;">
                                Important : ne partagez pas ce message. Si vous n'êtes pas à l'origine de cette modification, contactez l'administration.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
                            <p style="margin:0;color:#6b7280;font-size:12px;line-height:18px;">
                                Message automatique, merci de ne pas y répondre.<br>
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
