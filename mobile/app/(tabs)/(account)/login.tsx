import React, { useState } from "react";
import { Alert, Image as RNImage } from "react-native";
import { View, Text, ScrollView, Pressable, TextInput } from "@/tw";
import { router, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleEmailAuth() {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert("Thành công", "Kiểm tra email để xác nhận tài khoản");
        return;
      }
      router.back();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    try {
      const redirectUrl = Linking.createURL("/(profile)");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        if (result.type === "success" && result.url) {
          // Extract tokens from URL
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            router.back();
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể đăng nhập Google");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Đăng nhập" }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-6 gap-5 py-8"
        keyboardDismissMode="on-drag"
      >
        {/* Logo */}
        <View className="items-center gap-2 mb-4">
          <RNImage
            source={require("../../../assets/logo.png")}
            style={{ width: 64, height: 64, borderRadius: 16 }}
          />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#7c3aed",
              marginTop: 4,
            }}
          >
            TruyenCity
          </Text>
          <Text className="text-muted-foreground text-sm">
            {mode === "login" ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}
          </Text>
        </View>

        {/* Google sign in */}
        <Pressable
          onPress={handleGoogleAuth}
          className="bg-card border border-border rounded-xl py-3.5 flex-row items-center justify-center gap-2"
        >
          <Text className="text-lg">G</Text>
          <Text className="text-foreground font-medium">Tiếp tục với Google</Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-muted-foreground text-sm">hoặc</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        {/* Email form */}
        <View className="gap-3">
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3 text-foreground"
            placeholder="Email"
            placeholderTextColor="hsl(220 10% 55%)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3 text-foreground"
            placeholder="Mật khẩu"
            placeholderTextColor="hsl(220 10% 55%)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
        </View>

        <Pressable
          onPress={handleEmailAuth}
          className="bg-primary rounded-xl py-3.5 items-center"
          disabled={loading}
        >
          <Text className="text-primary-foreground font-semibold">
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Đăng ký"}
          </Text>
        </Pressable>

        {/* Toggle mode */}
        <Pressable
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          className="items-center"
        >
          <Text className="text-muted-foreground text-sm">
            {mode === "login"
              ? "Chưa có tài khoản? "
              : "Đã có tài khoản? "}
            <Text className="text-primary font-medium">
              {mode === "login" ? "Đăng ký" : "Đăng nhập"}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
