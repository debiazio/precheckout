export type TCountDown = {
  children?: React.ReactNode | JSX.Element;
  dateEnd: string;
  messageFinish: string;
  messageCurrent: string;
  backgroundColor?: string;
  textColor?: string;
};
export interface ICountDown {
  currentDays: string;
  currentHours: string;
  currentMinutes: string;
  currentSeconds: string;
  tempoEsgotado: boolean;
  messageFinish: string;
  messageCurrent: string;
  backgroundColor?: string;
  textColor?: string;
}

export const INITIAL_VALUE: ICountDown = {
  currentDays: "0",
  currentHours: "0",
  currentMinutes: "0",
  currentSeconds: "0",
  tempoEsgotado: true,
  messageFinish: "Oferta Finalizada",
  messageCurrent: "Termina em: "
};
