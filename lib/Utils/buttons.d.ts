/** Translate a single clean button definition into a native button node. */
export function translateButtonToNative(button: any): {
    name: string;
    buttonParamsJson: string;
};
/** Translate an array of clean buttons into native buttons. */
export function buildNativeButtons(buttons: any[]): {
    name: string;
    buttonParamsJson: string;
}[];
