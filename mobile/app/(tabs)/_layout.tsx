import {
  NativeTabs,
  Icon,
  Label,
} from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(discover)">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Trang Chủ</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(rankings)">
        <Icon sf={{ default: "safari", selected: "safari.fill" }} />
        <Label>Khám Phá</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Tủ Sách</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(account)">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Cài Đặt</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
