namespace GameVault.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public ApiMeta? Meta { get; set; }
    public ApiError? Error { get; set; }

    public static ApiResponse<T> Ok(T data, ApiMeta? meta = null) => new() { Data = data, Meta = meta };
    public static ApiResponse<T> Fail(string code, string message) => new() { Success = false, Error = new ApiError(code, message) };
}

public record ApiMeta(int Page, int PageSize, int Total);

public record ApiError(string Code, string Message);

public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}

public class AppException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }

    public AppException(string code, string message, int statusCode = 400) : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}
