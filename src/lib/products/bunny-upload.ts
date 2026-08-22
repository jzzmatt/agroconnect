export async function uploadToBunnyTus(params: {
  file: File;
  uploadUrl: string;
  libraryId: string;
  videoId: string;
  signature: string;
  expire: number;
  signal?: AbortSignal;
}): Promise<boolean> {
  const endpoint = params.uploadUrl || "https://video.bunnycdn.com/tusupload";
  const create = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(params.file.size),
      "Upload-Metadata": `filetype ${btoa(params.file.type)},title ${btoa(params.file.name)}`,
      AuthorizationSignature: params.signature,
      AuthorizationExpire: String(params.expire),
      LibraryId: params.libraryId,
      VideoId: params.videoId,
    },
    signal: params.signal,
  });

  const location = create.headers.get("Location") || endpoint;
  if (!create.ok && create.status !== 201 && create.status !== 204) {
    return false;
  }

  const patch = await fetch(location, {
    method: "PATCH",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
      AuthorizationSignature: params.signature,
      AuthorizationExpire: String(params.expire),
      LibraryId: params.libraryId,
      VideoId: params.videoId,
    },
    body: params.file,
    signal: params.signal,
  });

  return patch.ok || patch.status === 204;
}
