// Powered by OnSpace.AI
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nManager } from 'react-native';

I18nManager.forceRTL(true);

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="add-product"
                options={{
                  headerShown: true,
                  headerTitle: 'إضافة / تعديل منتج',
                  headerStyle: { backgroundColor: '#1E293B' },
                  headerTintColor: '#F8FAFC',
                  headerBackTitle: 'رجوع',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="customer-detail"
                options={{
                  headerShown: true,
                  headerTitle: 'تفاصيل الزبون',
                  headerStyle: { backgroundColor: '#1E293B' },
                  headerTintColor: '#F8FAFC',
                  headerBackTitle: 'رجوع',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="invoice-detail"
                options={{
                  headerShown: true,
                  headerTitle: 'تفاصيل الفاتورة',
                  headerStyle: { backgroundColor: '#1E293B' },
                  headerTintColor: '#F8FAFC',
                  headerBackTitle: 'رجوع',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: true,
                  headerTitle: 'الإعدادات',
                  headerStyle: { backgroundColor: '#1E293B' },
                  headerTintColor: '#F8FAFC',
                  headerBackTitle: 'رجوع',
                }}
              />
              <Stack.Screen name="expenses" options={{ headerShown: false }} />
              <Stack.Screen name="suppliers" options={{ headerShown: false }} />
              <Stack.Screen name="shifts" options={{ headerShown: false }} />
            </Stack>
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
