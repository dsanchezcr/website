using api;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for the HealthCheck response structure and status logic.
/// </summary>
public class HealthCheckResponseTests
{
    [Fact]
    public void HealthStatus_HasExpectedValues()
    {
        // Verify enum values exist and can be used
        Assert.Equal(0, (int)HealthStatus.Healthy);
        Assert.Equal(1, (int)HealthStatus.Degraded);
        Assert.Equal(2, (int)HealthStatus.Unhealthy);
    }

    [Fact]
    public void HealthStatus_AllValuesAreDefined()
    {
        var values = Enum.GetValues<HealthStatus>();
        Assert.Equal(3, values.Length);
        Assert.Contains(HealthStatus.Healthy, values);
        Assert.Contains(HealthStatus.Degraded, values);
        Assert.Contains(HealthStatus.Unhealthy, values);
    }

    [Fact]
    public void OverallStatus_WhenAnyUnhealthy_IsUnhealthy()
    {
        var statuses = new List<HealthStatus>
        {
            HealthStatus.Healthy,
            HealthStatus.Unhealthy,
            HealthStatus.Degraded
        };

        var overall = HealthStatusHelper.DetermineOverallStatus(statuses);
        Assert.Equal(HealthStatus.Unhealthy, overall);
    }

    [Fact]
    public void OverallStatus_WhenDegradedButNoUnhealthy_IsDegraded()
    {
        var statuses = new List<HealthStatus>
        {
            HealthStatus.Healthy,
            HealthStatus.Degraded,
            HealthStatus.Healthy
        };

        var overall = HealthStatusHelper.DetermineOverallStatus(statuses);
        Assert.Equal(HealthStatus.Degraded, overall);
    }

    [Fact]
    public void OverallStatus_WhenAllHealthy_IsHealthy()
    {
        var statuses = new List<HealthStatus>
        {
            HealthStatus.Healthy,
            HealthStatus.Healthy,
            HealthStatus.Healthy
        };

        var overall = HealthStatusHelper.DetermineOverallStatus(statuses);
        Assert.Equal(HealthStatus.Healthy, overall);
    }
}
