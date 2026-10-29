import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1d4ed8',
    colorInfo: '#1d4ed8',
    colorSuccess: '#15803d',
    colorWarning: '#d97706',
    colorError: '#b91c1c',
    colorTextBase: '#0f172a',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f4f7fb',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#e2e8f0',
    borderRadius: 10,
    borderRadiusLG: 16,
    fontFamily:
      "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    controlHeight: 38,
  },
  components: {
    Layout: {
      siderBg: '#0b1f3f',
      headerBg: '#ffffff',
      bodyBg: '#f4f7fb',
    },
    Menu: {
      darkItemBg: '#0b1f3f',
      darkItemColor: 'rgba(248, 250, 252, 0.72)',
      darkItemSelectedBg: '#1d4ed8',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverBg: 'rgba(248, 250, 252, 0.08)',
      darkItemHoverColor: '#ffffff',
      itemBorderRadius: 10,
      itemMarginInline: 12,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#64748b',
      rowHoverBg: '#f8fbff',
      borderColor: '#e2e8f0',
    },
    Card: {
      borderRadiusLG: 16,
    },
    Button: {
      controlHeight: 38,
      fontWeight: 600,
    },
    Input: {
      controlHeight: 38,
    },
    Select: {
      controlHeight: 38,
    },
    DatePicker: {
      controlHeight: 38,
    },
  },
}
