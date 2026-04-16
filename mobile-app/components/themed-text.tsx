import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'action';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const theme = useColorScheme() ?? 'light';
  const tintColor = Colors[theme].tint;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        // Override link color dynamically based on theme
        type === 'link' ? { ...styles.link, color: tintColor } : undefined,
        type === 'action' ? styles.action : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.body, // 18px minimum
    lineHeight: Typography.body * 1.5,
  },
  defaultSemiBold: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.5,
    fontWeight: '600',
  },
  title: {
    fontSize: Typography.header + 6, // 28px for main screen titles
    fontWeight: 'bold',
    lineHeight: (Typography.header + 6) * 1.2,
  },
  subtitle: {
    fontSize: Typography.header, // 22px for medication names
    fontWeight: 'bold',
  },
  link: {
    lineHeight: Typography.body * 1.5,
    fontSize: Typography.body,
  },
  action: {
    fontSize: Typography.action, // 36px for primary buttons
    fontWeight: 'bold',
    textAlign: 'center',
  }
});