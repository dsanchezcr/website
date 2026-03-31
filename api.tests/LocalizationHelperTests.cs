using Xunit;

namespace api.tests;

public class LocalizationHelperTests
{
    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void GetText_AllLocales_ReturnNonEmptyStrings(string language)
    {
        var keys = new[]
        {
            "successMessage", "verificationSent", "verificationSubject",
            "verificationMessage", "verificationSuccess", "verificationError",
            "notificationSubject", "notificationTitle", "fieldLabels",
            "confirmationSubject", "confirmationGreeting", "confirmationMessage",
            "confirmationSignature", "confirmationTitle"
        };

        foreach (var key in keys)
        {
            var result = LocalizationHelper.GetText(language, key);
            Assert.False(string.IsNullOrWhiteSpace(result), $"Key '{key}' for locale '{language}' returned empty string");
        }
    }

    [Fact]
    public void GetText_UnsupportedLanguage_FallsBackToEnglish()
    {
        var enResult = LocalizationHelper.GetText("en", "successMessage");
        var frResult = LocalizationHelper.GetText("fr", "successMessage");

        Assert.Equal(enResult, frResult);
    }

    [Fact]
    public void GetText_UnknownKey_ReturnsKeyAsDefault()
    {
        var result = LocalizationHelper.GetText("en", "nonExistentKey");
        Assert.Equal("nonExistentKey", result);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void GetText_WithFormatArgs_FormatsCorrectly(string language)
    {
        var result = LocalizationHelper.GetText(language, "confirmationGreeting", "John");
        Assert.Contains("John", result);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void GetText_VerificationMessage_ContainsUrlPlaceholder(string language)
    {
        var url = "https://example.com/verify?token=abc";
        var result = LocalizationHelper.GetText(language, "verificationMessage", url);
        Assert.Contains(url, result);
    }

    [Theory]
    [InlineData("en", true, "Verification Successful")]
    [InlineData("en", false, "Verification Error")]
    [InlineData("es", true, "Verificación Exitosa")]
    [InlineData("es", false, "Error de Verificación")]
    [InlineData("pt", true, "Verificação Bem-sucedida")]
    [InlineData("pt", false, "Erro de Verificação")]
    public void GetVerificationPageTitle_ReturnsCorrectTitle(string language, bool isSuccess, string expected)
    {
        var result = LocalizationHelper.GetVerificationPageTitle(language, isSuccess);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("en", "Return to Home")]
    [InlineData("es", "Volver al Inicio")]
    [InlineData("pt", "Voltar ao Início")]
    public void GetReturnHomeText_ReturnsCorrectText(string language, string expected)
    {
        var result = LocalizationHelper.GetReturnHomeText(language);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void GetHomeUrl_ReturnsCorrectUrlForLocale(string language)
    {
        var result = LocalizationHelper.GetHomeUrl(language);
        if (language != "en")
        {
            Assert.Contains($"/{language}/", result);
        }
        Assert.EndsWith("/", result);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void AllLocales_HaveSameKeys(string language)
    {
        // All locales should support the same keys - test by comparing to English
        var enKeys = new[]
        {
            "successMessage", "verificationSent", "verificationSubject",
            "verificationMessage", "verificationSuccess", "verificationError",
            "notificationSubject", "notificationTitle", "fieldLabels",
            "confirmationSubject", "confirmationGreeting", "confirmationMessage",
            "confirmationSignature", "confirmationTitle"
        };

        foreach (var key in enKeys)
        {
            var enText = LocalizationHelper.GetText("en", key);
            var localizedText = LocalizationHelper.GetText(language, key);

            // Localized text should not equal the key (which means it was found)
            Assert.NotEqual(key, localizedText);
            // Localized text should be different from English for non-English locales
            // (unless the key value happens to be the same)
            if (language != "en")
            {
                // Just verify non-empty - translations may legitimately be similar
                Assert.False(string.IsNullOrWhiteSpace(localizedText));
            }
        }
    }
}
