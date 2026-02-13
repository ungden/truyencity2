# Store Submission Guide - TruyenCity

## Build Status

| Platform | Status | Location |
|----------|--------|----------|
| iOS | ✅ Built Successfully | `~/Library/Developer/Xcode/DerivedData/TruyenCity-*/Build/Products/Debug-iphonesimulator/TruyenCity.app` |
| Android | ⚠️ Requires Java | Run `cd mobile/android && ./gradlew assembleDebug` after installing JDK 17 |

---

## iOS App Store Submission

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Login with your Apple Developer account
3. Click **My Apps** → **+** → **New App**
4. Fill in details:
   - **Name**: TruyenCity
   - **Bundle ID**: com.truyencity.app (must match `mobile/app.config.ts`)
   - **SKU**: truyencity-app-001
   - **Platforms**: iOS
   - **User Access**: Full Access

### Step 2: Prepare Store Listing

**App Information:**
- **Primary Category**: Books
- **Secondary Category**: Entertainment
- **Content Rights**: No (all content is original AI-generated)

**App Information - Full Details:**
- **Age Rating**: ✅ Complete the questionnaire
  - Cartoon/Fantasy Violence: No
  - Realistic Violence: No
  - Sexual Content/Nudity: No
  - Profanity/Crude Humor: No
  - Drug/Alcohol References: No
  - Gambling: No
  - Horror/Fear Themes: No
  - Medical/Treatment Advice: No
  - User-Generated Content: No
- **Available in**: Vietnam, United States (select your target countries)

### Step 3: App Preview & Screenshots

Required screenshots for iPhone (6.9" display):

| Size | Description |
|------|-------------|
| 6.9" (1290 x 2796) | App Preview - Main screen showing novel list |
| 6.9" (1290 x 2796) | App Preview - Reading screen with TTS |
| 6.9" (1290 x 2796) | App Preview - Profile with gamification |
| 6.9" (1290 x 2796) | App Preview - Library/offline reading |

Screenshot guidelines:
- Show actual app UI (use Simulator to capture)
- No device frame, no text overlays
- Show real content (not placeholder)

### Step 4: Build Submission

**Option A: Using EAS (Recommended)**
```bash
cd mobile
npx eas init  # Follow prompts to create EAS project
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

**Option B: Manual Upload**
1. Archive build in Xcode: Product → Archive
2. Distribute App Store Connect
3. Wait for processing (10-30 minutes)

### Step 5: Submit for Review

- **Review Information**: 
  - Demo Account: Create test account with sample data
  - Notes: "TruyenCity is a Vietnamese webnovel reading platform with AI-generated content. Users can read novels, track progress offline, and earn achievements through our gamification system."

---

## Google Play Store Submission

### Step 1: Create App in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app:
   - **App name**: TruyenCity
   - **Default language**: Vietnamese (Vietnam)
   - **App type**: App
   - **Free or Paid**: Free

### Step 2: App Release

1. **App bundles**: Upload `.aab` file
   - Generate: `cd mobile/android && ./gradlew assembleRelease`
2. **Release name**: 1.0.0
3. **Release notes**: "First release of TruyenCity - Vietnamese webnovel reading platform"

### Step 3: Store Listing

**Title**: TruyenCity - Đọc Truyện Online

**Short Description (Vietnamese)**:
> Nền tảng đọc truyện online miễn phí hàng đầu Việt Nam. Tiên hiệp, huyền huyễn, đô thị, ngôn tình.

**Full Description**:
```
TruyenCity - Ứng dụng đọc truyện online miễn phí

📚 Kho truyện đa dạng
- Tiên hiệp, huyền huyễn, đô thị, ngôn tình
- Truyện mới cập nhật liên tục mỗi ngày
- Hơn 1000+ chương cho mỗi bộ truyện

📖 Trải nghiệm đọc tuyệt vời
- Giao diện tối dễ đọc
- TTS đọc truyện tự động
- Đọc offline không cần internet
- Theo dõi tiến độ đọc tự động

🏆 Hệ thống gamification
- Thăng cấp tu luyện
- Thu thập thành tựu
- Đọc mỗi ngày nhận thưởng

Tải ngay miễn phí!
```

**Screenshots** (Required: 2-8 screenshots):
- Phone screenshots (1080 x 1920): Similar to iOS
- Feature graphic (1024 x 500): App logo + name

**Categorization**:
- **Application type**: Games (select "No" for game)
- **Category**: Books & Reference → Books & Audiobooks
- **Tags**: truyện, đọc truyện, tiên hiệp, huyền huyễn, ngôn tình

### Step 4: Content Rating

Complete the questionnaire:
- **Violence**: No
- **Sexual Content**: No
- **Profanity**: No
- **Drugs**: No
- **Gambling**: No
- **Age Rating**: 12+ (Teen)

### Step 5: Data Safety

**Data Collection Disclosure**:

| Data Type | Collected | Purpose |
|-----------|-----------|---------|
| Email/Name | Yes | Account authentication |
| Reading history | Yes | Progress sync |
| Offline content | Yes | Offline reading feature |
| Device info | Yes | Analytics |

- **Data is encrypted**: Yes
- **Data is shared**: No third parties
- **Delete option**: Yes, via support email

### Step 6: Pricing & Distribution

- **Price**: Free
- **Countries**: Vietnam, United States (expand as needed)
- **Target audience**: All ages

---

## Legal Pages Required

Ensure these pages are accessible from your website:

| Page | URL | Required By |
|------|-----|-------------|
| Privacy Policy | `https://truyencity.com/privacy` | Both stores |
| Terms of Service | `https://truyencity.com/terms` | Both stores |
| Support | `https://truyencity.com/support` | Both stores |
| Account Deletion | `https://truyencity.com/account-deletion` | Apple (GDPR/CCPA) |

---

## Configuration Files

### Key Configuration Values

**Bundle ID (iOS)**: `com.truyencity.app`
**Package Name (Android)**: `com.truyencity.app`
**Version**: `1.0.0`
**Build Number**: `1`

**App Config Location**: `mobile/app.config.ts`
**Package.json Location**: `mobile/package.json`

---

## Troubleshooting

### iOS Issues
- **Invalid Bundle ID**: Ensure it matches exactly in App Store Connect
- **Build Not Appearing**: Wait 10-30 minutes for processing

### Android Issues
- **Java Error**: Install JDK 17: `brew install openjdk@17`
- **SDK Not Found**: Run `sdkmanager` from Android SDK

### Common Errors
- **Age Rating Rejection**: Complete all questionnaire sections honestly
- **Screenshot Rejection**: Use actual app screenshots, no device frames
- **Metadata Rejected**: Ensure no placeholder text

---

## Notes

1. **AI-Generated Content**: Both stores accept AI-generated content. Document that all stories are original AI-generated.
2. **Copyright**: Ensure no copyrighted material is included
3. **In-App Purchases**: Not required for MVP (free app)
4. **Analytics**: Consider adding Firebase/Analytics later
