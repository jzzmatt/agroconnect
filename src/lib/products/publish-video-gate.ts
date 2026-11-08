export type PublishVideoGate = "wait" | "save_required" | "ask_thumbnail" | "continue";

export function publishVideoGate(input: {
  hasVideoFile: boolean;
  videoSaved: boolean;
  videoSaving: boolean;
}): PublishVideoGate {
  if (!input.hasVideoFile) return "continue";
  if (input.videoSaving) return "wait";
  if (!input.videoSaved) return "save_required";
  return "ask_thumbnail";
}
