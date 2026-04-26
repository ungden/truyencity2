import React, { useState } from "react";
import { Alert, Image as RNImage, Platform } from "react-native";
import { View, Text, ScrollView, Pressable, TextInput } from "@/tw";
import { router, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Linking as RNLinking } from "react-native";
import * as AppleAuthentication from 'expo-apple-authentication';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleEmailAuth() {
    if (!email.trim() || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data?.session) throw new Error("Không nhận được phiên đăng nhập");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // If email confirmation is required, user won't have a session yet
        if (!data?.session) {
          Alert.alert("Thành công", "Kiểm tra email để xác nhận tài khoản");
          return;
        }
      }
      router.replace("/(tabs)/(account)");
    } catch (error: any) {
      const msg = error?.message || "Đã có lỗi xảy ra";
      // Translate common Supabase auth errors to Vietnamese
      const translated = msg.includes("Invalid login credentials")
        ? "Email hoặc mật khẩu không đúng"
        : msg.includes("Email not confirmed")
          ? "Email chưa được xác nhận. Kiểm tra hộp thư."
          : msg.includes("User already registered")
            ? "Email đã được đăng ký. Hãy đăng nhập."
            : msg;
      Alert.alert("Lỗi", translated);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      // NOTE: this redirect URL must be whitelisted in the Supabase project
      // dashboard (Authentication → URL Configuration → Redirect URLs).
      // We keep the existing `/(account)` form to avoid invalidating the
      // already-configured allow-list entry.
      const redirectUrl = Linking.createURL("/(account)");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Không lấy được URL đăng nhập");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      // Always dismiss the in-app browser, regardless of result type — guards
      // against the SFAuthenticationSession staying visible if the session
      // ended via an unusual path (cancel, dismiss, error).
      try {
        WebBrowser.dismissBrowser();
      } catch {}

      if (result.type !== "success" || !result.url) {
        // User canceled or browser was dismissed without redirect — bail
        // silently. The finally block resets loading.
        return;
      }

      const hashIndex = result.url.indexOf("#");
      if (hashIndex === -1) throw new Error("Phản hồi không có token");
      const params = new URLSearchParams(result.url.substring(hashIndex + 1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        throw new Error("Thiếu token trong phản hồi");
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setErr) throw setErr;

      // Defensive: confirm the session is readable before we navigate. This
      // guarantees `onAuthStateChange` has fired SIGNED_IN by the time the
      // account screen regains focus.
      const { data: checkData } = await supabase.auth.getSession();
      if (!checkData?.session) {
        throw new Error("Phiên đăng nhập không được lưu");
      }

      // Use replace() — modal dismiss via back() can be a no-op when the
      // navigation stack was rehydrated cold (deep link, kill+relaunch).
      router.replace("/(tabs)/(account)");
    } catch (error: any) {
      console.warn("[login] Google sign-in failed:", error);
      Alert.alert("Lỗi", error?.message || "Không thể đăng nhập Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleAuth() {
    // Guard against Apple Sign In not being available (should never fire on
    // iOS 13+ but covers simulators/older devices gracefully).
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "Không khả dụng",
          "Đăng nhập Apple không khả dụng trên thiết bị này."
        );
        return;
      }
    } catch {
      // non-fatal — continue and let signInAsync throw if truly unavailable
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Không nhận được token từ Apple");
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) throw error;
      if (!data?.session) {
        throw new Error("Không nhận được phiên đăng nhập");
      }

      // Defensive: make sure the session is actually readable from storage
      // before we navigate. This catches the class of bug that caused the
      // April 2026 App Store rejection (session written but not retrievable).
      const { data: checkData } = await supabase.auth.getSession();
      if (!checkData?.session) {
        throw new Error("Phiên đăng nhập không được lưu, vui lòng thử lại");
      }

      // Always replace() — back() was the source of the "phải thoát app vào
      // lại" bug. When the login screen is the modal root, back() can be a
      // no-op (or dismiss without re-firing focus on the parent), leaving the
      // user staring at a stale UI. replace() forces a fresh mount of the
      // account screen which always picks up the new session.
      router.replace("/(tabs)/(account)");
    } catch (error: any) {
      // User canceled the native Apple sheet — not an error, just bail.
      if (
        error?.code === "ERR_REQUEST_CANCELED" ||
        error?.code === "ERR_CANCELED"
      ) {
        return;
      }
      console.warn("[login] Apple sign-in failed:", error);
      Alert.alert(
        "Lỗi",
        error?.message || "Không thể đăng nhập bằng Apple. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
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

        {/* Apple sign in (iOS only) */}
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
            cornerRadius={12}
            style={{ width: "100%", height: 52 }}
            onPress={handleAppleAuth}
          />
        )}

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

        {/* Legal links */}
        <View className="items-center gap-2 mt-4">
          <Text className="text-muted-foreground text-xs">
            Bằng việc tiếp tục, bạn đồng ý với
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => RNLinking.openURL("https://truyencity.com/terms")}>
              <Text className="text-primary text-xs font-medium">Điều khoản sử dụng</Text>
            </Pressable>
            <Text className="text-muted-foreground text-xs">và</Text>
            <Pressable onPress={() => RNLinking.openURL("https://truyencity.com/privacy")}>
              <Text className="text-primary text-xs font-medium">Chính sách bảo mật</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
