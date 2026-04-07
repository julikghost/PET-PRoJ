import oc from 'open-color';

/**
 * UI colors from the [open-color](https://github.com/yeun/open-color) palette
 * (not Ant Design’s default blue scale).
 */
export const petTheme = {
    primary: oc.teal[6],
    primaryHover: oc.teal[7],
    primaryActive: oc.teal[8],

    siderBg: oc.gray[8],

    headerBg: oc.teal[8],
    headerText: oc.gray[0],

    pageBg: oc.gray[0],
    surface: oc.gray[0],
    mutedBorder: oc.gray[4],
    text: oc.gray[8],
    textMuted: oc.gray[6],
} as const;
