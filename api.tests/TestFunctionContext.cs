using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;

namespace api.tests;

internal sealed class TestFunctionContext : FunctionContext
{
    public override string InvocationId => "test-invocation";
    public override string FunctionId => "test-function";
    public override TraceContext TraceContext => throw new NotSupportedException();
    public override BindingContext BindingContext => throw new NotSupportedException();
    public override RetryContext RetryContext => throw new NotSupportedException();
    public override IServiceProvider InstanceServices { get; set; } = new ServiceCollection().BuildServiceProvider();
    public override FunctionDefinition FunctionDefinition => throw new NotSupportedException();
    public override IDictionary<object, object> Items { get; set; } = new Dictionary<object, object>();
    public override IInvocationFeatures Features => throw new NotSupportedException();
}
