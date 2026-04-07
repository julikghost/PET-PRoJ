import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { PetLogisticsProvider } from './context/PetLogisticsContext';
import { AppBackground } from './components/AppBackground';
import { petTheme } from './theme/palette';
import oc from 'open-color';
import { Toaster } from 'sonner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
            <AppBackground />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <ConfigProvider
                    theme={{
                        token: {
                            colorPrimary: petTheme.primary,
                            colorPrimaryHover: petTheme.primaryHover,
                            colorPrimaryActive: petTheme.primaryActive,
                            colorLink: petTheme.primary,
                            colorSuccess: oc.green[6],
                            colorWarning: oc.yellow[6],
                            colorError: oc.red[6],
                            colorInfo: oc.cyan[6],
                            colorBgLayout: 'transparent',
                            colorText: petTheme.text,
                        },
                        algorithm: theme.defaultAlgorithm,
                    }}
                >
                    <AntApp>
                        <BrowserRouter>
                            <PetLogisticsProvider>
                                <App />
                            </PetLogisticsProvider>
                        </BrowserRouter>
                        <Toaster richColors position="top-center" closeButton />
                    </AntApp>
                </ConfigProvider>
            </div>
        </div>
    </React.StrictMode>
);
