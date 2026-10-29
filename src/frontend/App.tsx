import { App as AntdApp, ConfigProvider } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppRoutes } from './routes/AppRoutes'
import { appTheme } from './theme'

export default function App() {
  return (
    <ConfigProvider theme={appTheme}>
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
