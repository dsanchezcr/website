namespace api;

/// <summary>
/// Centralized localization strings for the contact form workflow.
/// Supports English (en), Spanish (es), and Portuguese (pt).
/// </summary>
public static class LocalizationHelper
{
    private static readonly Dictionary<string, Dictionary<string, string>> Localizations = new()
    {
        ["en"] = new()
        {
            // SendEmail - General messages
            ["successMessage"] = "Emails sent successfully.",
            
            // SendEmail - Verification workflow (sent to user for email verification)
            ["verificationSent"] = "Please check your email to verify your contact request.",
            ["verificationSubject"] = "Verify your contact request",
            ["verificationMessage"] = "Please click the link below to verify your contact request:<br/><br/><a href=\"{0}\">Verify Email</a><br/><br/>This link will expire in 24 hours.",
            
            // VerifyEmail - Verification result messages
            ["verificationSuccess"] = "Your email has been verified successfully! I will get back to you soon.",
            ["verificationError"] = "Invalid or expired verification link. Please submit the contact form again.",
            
            // VerifyEmail - Notification email (sent to site owner)
            ["notificationSubject"] = "New website message from {0}",
            ["notificationTitle"] = "New Contact Form Submission",
            ["fieldLabels"] = "Name:|Email:|Message:",
            
            // VerifyEmail - Confirmation email (sent to user after verification)
            ["confirmationSubject"] = "Thank you for contacting David Sanchez",
            ["confirmationGreeting"] = "Hello {0},",
            ["confirmationMessage"] = "Thank you very much for your message. I will try to get back to you as soon as possible.",
            ["confirmationSignature"] = "Best regards,<br/>David Sanchez",
            ["confirmationTitle"] = "Thank you for reaching out!"
        },
        ["es"] = new()
        {
            // SendEmail - General messages
            ["successMessage"] = "Correos enviados exitosamente.",
            
            // SendEmail - Verification workflow
            ["verificationSent"] = "Por favor revisa tu correo para verificar tu solicitud de contacto.",
            ["verificationSubject"] = "Verifica tu solicitud de contacto",
            ["verificationMessage"] = "Por favor haz clic en el enlace a continuación para verificar tu solicitud de contacto:<br/><br/><a href=\"{0}\">Verificar Correo</a><br/><br/>Este enlace expirará en 24 horas.",
            
            // VerifyEmail - Verification result messages
            ["verificationSuccess"] = "¡Tu correo ha sido verificado exitosamente! Te responderé pronto.",
            ["verificationError"] = "Enlace de verificación inválido o expirado. Por favor envía el formulario de contacto nuevamente.",
            
            // VerifyEmail - Notification email
            ["notificationSubject"] = "Nuevo mensaje del sitio web de {0}",
            ["notificationTitle"] = "Nueva Consulta del Formulario de Contacto",
            ["fieldLabels"] = "Nombre:|Correo:|Mensaje:",
            
            // VerifyEmail - Confirmation email
            ["confirmationSubject"] = "Gracias por contactar a David Sanchez",
            ["confirmationGreeting"] = "Hola {0},",
            ["confirmationMessage"] = "Muchas gracias por tu mensaje. Trataré de responderte lo antes posible.",
            ["confirmationSignature"] = "Saludos cordiales,<br/>David Sanchez",
            ["confirmationTitle"] = "¡Gracias por comunicarte!"
        },
        ["pt"] = new()
        {
            // SendEmail - General messages
            ["successMessage"] = "E-mails enviados com sucesso.",
            
            // SendEmail - Verification workflow
            ["verificationSent"] = "Por favor, verifique seu e-mail para confirmar sua solicitação de contato.",
            ["verificationSubject"] = "Verifique sua solicitação de contato",
            ["verificationMessage"] = "Por favor, clique no link abaixo para verificar sua solicitação de contato:<br/><br/><a href=\"{0}\">Verificar E-mail</a><br/><br/>Este link expirará em 24 horas.",
            
            // VerifyEmail - Verification result messages
            ["verificationSuccess"] = "Seu e-mail foi verificado com sucesso! Responderei em breve.",
            ["verificationError"] = "Link de verificação inválido ou expirado. Por favor, envie o formulário de contato novamente.",
            
            // VerifyEmail - Notification email
            ["notificationSubject"] = "Nova mensagem do site de {0}",
            ["notificationTitle"] = "Nova Submissão do Formulário de Contato",
            ["fieldLabels"] = "Nome:|E-mail:|Mensagem:",
            
            // VerifyEmail - Confirmation email
            ["confirmationSubject"] = "Obrigado por entrar em contato com David Sanchez",
            ["confirmationGreeting"] = "Olá {0},",
            ["confirmationMessage"] = "Muito obrigado pela sua mensagem. Tentarei responder o mais breve possível.",
            ["confirmationSignature"] = "Atenciosamente,<br/>David Sanchez",
            ["confirmationTitle"] = "Obrigado por entrar em contato!"
        }
    };

    /// <summary>
    /// Gets localized text for the specified language and key.
    /// Falls back to English if the language or key is not found.
    /// </summary>
    /// <param name="language">Language code (en, es, pt)</param>
    /// <param name="key">Localization key</param>
    /// <param name="args">Optional format arguments</param>
    /// <returns>Localized and formatted text</returns>
    public static string GetText(string language, string key, params object[] args)
    {
        var lang = Localizations.ContainsKey(language) ? language : "en";
        var text = Localizations[lang].GetValueOrDefault(key, Localizations["en"].GetValueOrDefault(key, key));
        return args.Length > 0 ? string.Format(text, args) : text;
    }

    /// <summary>
    /// Gets the HTML page title for verification result pages.
    /// </summary>
    public static string GetVerificationPageTitle(string language, bool isSuccess)
    {
        return (language, isSuccess) switch
        {
            ("es", true) => "Verificación Exitosa",
            ("es", false) => "Error de Verificación",
            ("pt", true) => "Verificação Bem-sucedida",
            ("pt", false) => "Erro de Verificação",
            (_, true) => "Verification Successful",
            (_, false) => "Verification Error"
        };
    }

    /// <summary>
    /// Gets the "Return to Home" link text for the specified language.
    /// </summary>
    public static string GetReturnHomeText(string language)
    {
        return language switch
        {
            "es" => "Volver al Inicio",
            "pt" => "Voltar ao Início",
            _ => "Return to Home"
        };
    }

    /// <summary>
    /// Gets the home URL for the specified language.
    /// Uses WEBSITE_URL environment variable if available, otherwise defaults to production URL.
    /// </summary>
    public static string GetHomeUrl(string language)
    {
        var baseUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        // Ensure base URL doesn't have trailing slash for consistent concatenation
        baseUrl = baseUrl.TrimEnd('/');
        
        return language switch
        {
            "es" => $"{baseUrl}/es/",
            "pt" => $"{baseUrl}/pt/",
            _ => $"{baseUrl}/"
        };
    }
}
