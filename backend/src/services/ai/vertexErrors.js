function toVertexFailure(error) {
  const status = error?.status ?? error?.code ?? error?.cause?.status;
  const name = String(error?.name || "");
  const raw = String(error?.message || "Vertex request failed");

  let code = "UNAVAILABLE";
  if (name === "AbortError" || /timeout/i.test(raw)) code = "TIMEOUT";
  else if (
    status === "ENOENT" ||
    /enoent|no such file|could not load the default credentials|unable to read/i.test(
      raw
    )
  ) {
    code = "MISCONFIGURED";
  } else if (
    status === 401 ||
    status === 403 ||
    /unauth|permission_denied|billing/i.test(raw)
  ) {
    code = "UNAUTHENTICATED";
  } else if (
    status === 400 ||
    status === 404 ||
    /invalid|not_found|was not found/i.test(raw)
  ) {
    code = "INVALID_RESPONSE";
  }

  const message =
    code === "TIMEOUT"
      ? "Vertex timed out"
      : code === "MISCONFIGURED"
        ? "Vertex credentials file is missing"
        : code === "UNAUTHENTICATED"
          ? /billing/i.test(raw)
            ? "Vertex requires billing on the GCP project"
            : "Vertex rejected the credentials"
          : code === "INVALID_RESPONSE"
            ? /not_found|was not found|404/i.test(raw)
              ? "Vertex model is not available in this region"
              : "Vertex returned an unusable response"
            : "Vertex is unavailable";

  return { ok: false, code, message };
}

module.exports = { toVertexFailure };
