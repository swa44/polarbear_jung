export type AlimtalkSendType = "template" | "manual";
export type AlimtalkMsgType = "AT" | "AI";

export const ALIMTALK_CONFIG = {
  templateCode: "ESTIMATEJUNG",
  sendType: "template" as AlimtalkSendType,
  msgType: "AI" as AlimtalkMsgType,
  templateText:
    "안녕하세요\n폴라베어🐻‍❄️ 입니다.\n\n요청하신 견적이\n완료되었습니다.\n\n아래의 버튼을 눌러\n견적내용을 확인해주세요.\n\n*해당 메시지는\n견적을 요청하신 경우에만 발송됩니다.",
  button: {
    name: "견적서 확인하기",
    urlMobile: "https://#{견적서링크}",
    urlPc: "",
  },
} as const;

