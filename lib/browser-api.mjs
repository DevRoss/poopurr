export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// The HTTP gateway can return a sign-in page before our API is invoked.
// Never follow those redirects with a request containing PETKIT credentials.
/** @param {string | undefined} [action] */
export async function apiRequest(action = undefined, args = {}, fetcher = fetch) {
  let response;
  try {
    response = await fetcher('/api/petkit', {
      method: action ? 'POST' : 'GET',
      credentials: 'same-origin', cache: 'no-store', redirect: 'manual',
      headers: {Accept: 'application/json', ...(action ? {'Content-Type': 'application/json'} : {})},
      ...(action ? {body: JSON.stringify({action, ...(action === 'connect' ? args : {args})})} : {}),
    });
  } catch {
    throw new ApiError('network', '无法连接本站。请检查网络后重试；已有记录保留。');
  }
  if (response.type === 'opaqueredirect' || response.redirected ||
      [301,302,303,307,308,401].includes(response.status)) {
    throw new ApiError('auth', '本站登录已失效或需要重新验证。请点击“重新登录本站”，登录后再连接 PETKIT。');
  }
  const reference = response.headers.get('cf-ray');
  const detail = `HTTP ${response.status}` + (reference && /^[a-zA-Z0-9-]{1,80}$/.test(reference) ? ` · ${reference}` : '');
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    const code = response.status === 403 ? 'auth' : 'unexpected_response';
    throw new ApiError(code, `本站登录或网关返回了非预期页面（${detail}）。请重新登录本站后重试；这次未确认连接成功。`);
  }
  let body;
  try { body = await response.json(); }
  catch { throw new ApiError('invalid_response', `本站返回的数据不完整（${detail}），请稍后重试。`); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('invalid_response', `本站返回的数据格式异常（${detail}），请稍后重试。`);
  }
  if (!response.ok) throw new ApiError(body.code ?? 'api', typeof body.error === 'string' ? body.error : `请求失败（${detail}）。`);
  return body;
}
