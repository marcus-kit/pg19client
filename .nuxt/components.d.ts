
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const CommunityContextMenu: typeof import("../app/components/community/CommunityContextMenu.vue").default
export const CommunityMessage: typeof import("../app/components/community/CommunityMessage.vue").default
export const CommunityMessageInput: typeof import("../app/components/community/CommunityMessageInput.vue").default
export const CommunityMuteModal: typeof import("../app/components/community/CommunityMuteModal.vue").default
export const CommunityPinnedMessages: typeof import("../app/components/community/CommunityPinnedMessages.vue").default
export const CommunityReportModal: typeof import("../app/components/community/CommunityReportModal.vue").default
export const CommunityTypingIndicator: typeof import("../app/components/community/CommunityTypingIndicator.vue").default
export const DashboardBalanceCard: typeof import("../app/components/dashboard/DashboardBalanceCard.vue").default
export const DashboardConnectedServices: typeof import("../app/components/dashboard/DashboardConnectedServices.vue").default
export const DashboardConnectionCard: typeof import("../app/components/dashboard/DashboardConnectionCard.vue").default
export const DashboardConnectionProfile: typeof import("../app/components/dashboard/DashboardConnectionProfile.vue").default
export const DashboardNewsModal: typeof import("../app/components/dashboard/DashboardNewsModal.vue").default
export const DashboardReferralCard: typeof import("../app/components/dashboard/DashboardReferralCard.vue").default
export const ProfileAchievements: typeof import("../app/components/profile/ProfileAchievements.vue").default
export const ProfileAddressInfo: typeof import("../app/components/profile/ProfileAddressInfo.vue").default
export const ProfileAvatar: typeof import("../app/components/profile/ProfileAvatar.vue").default
export const ProfileContactInfo: typeof import("../app/components/profile/ProfileContactInfo.vue").default
export const ProfileContractInfo: typeof import("../app/components/profile/ProfileContractInfo.vue").default
export const ProfileNotifications: typeof import("../app/components/profile/ProfileNotifications.vue").default
export const ProfilePersonalInfo: typeof import("../app/components/profile/ProfilePersonalInfo.vue").default
export const ProfileReferral: typeof import("../app/components/profile/ProfileReferral.vue").default
export const ProfileSecurity: typeof import("../app/components/profile/ProfileSecurity.vue").default
export const ProfileTelegramLink: typeof import("../app/components/profile/ProfileTelegramLink.vue").default
export const Speedometer: typeof import("../app/components/speedtest/Speedometer.vue").default
export const UiBadge: typeof import("../app/components/ui/UiBadge.vue").default
export const UiButton: typeof import("../app/components/ui/UiButton.vue").default
export const UiCard: typeof import("../app/components/ui/UiCard.vue").default
export const UiEmptyState: typeof import("../app/components/ui/UiEmptyState.vue").default
export const UiErrorState: typeof import("../app/components/ui/UiErrorState.vue").default
export const UiInput: typeof import("../app/components/ui/UiInput.vue").default
export const UiModal: typeof import("../app/components/ui/UiModal.vue").default
export const UiRelativeTime: typeof import("../app/components/ui/UiRelativeTime.vue").default
export const UiSelect: typeof import("../app/components/ui/UiSelect.vue").default
export const UiSkeleton: typeof import("../app/components/ui/UiSkeleton.vue").default
export const UiTextarea: typeof import("../app/components/ui/UiTextarea.vue").default
export const UiToggle: typeof import("../app/components/ui/UiToggle.vue").default
export const NuxtWelcome: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/welcome.vue").default
export const NuxtLayout: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-layout").default
export const NuxtErrorBoundary: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue").default
export const ClientOnly: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/client-only").default
export const DevOnly: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/dev-only").default
export const ServerPlaceholder: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/server-placeholder").default
export const NuxtLink: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-link").default
export const NuxtLoadingIndicator: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-loading-indicator").default
export const NuxtTime: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-time.vue").default
export const NuxtRouteAnnouncer: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-route-announcer").default
export const NuxtImg: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtImg
export const NuxtPicture: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtPicture
export const Icon: typeof import("../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.1_vite@7.3.1_@types+node@25.0.10_jiti@2.6.1_terser@5.46.0_yaml@2.8.2__vue@3.5.27/node_modules/@nuxt/icon/dist/runtime/components/index").default
export const ColorScheme: typeof import("../node_modules/.pnpm/@nuxtjs+color-mode@4.0.0_magicast@0.5.1/node_modules/@nuxtjs/color-mode/dist/runtime/component.vue").default
export const NuxtPage: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/pages/runtime/page").default
export const NoScript: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").NoScript
export const Link: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Link
export const Base: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Base
export const Title: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Title
export const Meta: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Meta
export const Style: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Style
export const Head: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Head
export const Html: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Html
export const Body: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Body
export const NuxtIsland: typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-island").default
export const LazyCommunityContextMenu: LazyComponent<typeof import("../app/components/community/CommunityContextMenu.vue").default>
export const LazyCommunityMessage: LazyComponent<typeof import("../app/components/community/CommunityMessage.vue").default>
export const LazyCommunityMessageInput: LazyComponent<typeof import("../app/components/community/CommunityMessageInput.vue").default>
export const LazyCommunityMuteModal: LazyComponent<typeof import("../app/components/community/CommunityMuteModal.vue").default>
export const LazyCommunityPinnedMessages: LazyComponent<typeof import("../app/components/community/CommunityPinnedMessages.vue").default>
export const LazyCommunityReportModal: LazyComponent<typeof import("../app/components/community/CommunityReportModal.vue").default>
export const LazyCommunityTypingIndicator: LazyComponent<typeof import("../app/components/community/CommunityTypingIndicator.vue").default>
export const LazyDashboardBalanceCard: LazyComponent<typeof import("../app/components/dashboard/DashboardBalanceCard.vue").default>
export const LazyDashboardConnectedServices: LazyComponent<typeof import("../app/components/dashboard/DashboardConnectedServices.vue").default>
export const LazyDashboardConnectionCard: LazyComponent<typeof import("../app/components/dashboard/DashboardConnectionCard.vue").default>
export const LazyDashboardConnectionProfile: LazyComponent<typeof import("../app/components/dashboard/DashboardConnectionProfile.vue").default>
export const LazyDashboardNewsModal: LazyComponent<typeof import("../app/components/dashboard/DashboardNewsModal.vue").default>
export const LazyDashboardReferralCard: LazyComponent<typeof import("../app/components/dashboard/DashboardReferralCard.vue").default>
export const LazyProfileAchievements: LazyComponent<typeof import("../app/components/profile/ProfileAchievements.vue").default>
export const LazyProfileAddressInfo: LazyComponent<typeof import("../app/components/profile/ProfileAddressInfo.vue").default>
export const LazyProfileAvatar: LazyComponent<typeof import("../app/components/profile/ProfileAvatar.vue").default>
export const LazyProfileContactInfo: LazyComponent<typeof import("../app/components/profile/ProfileContactInfo.vue").default>
export const LazyProfileContractInfo: LazyComponent<typeof import("../app/components/profile/ProfileContractInfo.vue").default>
export const LazyProfileNotifications: LazyComponent<typeof import("../app/components/profile/ProfileNotifications.vue").default>
export const LazyProfilePersonalInfo: LazyComponent<typeof import("../app/components/profile/ProfilePersonalInfo.vue").default>
export const LazyProfileReferral: LazyComponent<typeof import("../app/components/profile/ProfileReferral.vue").default>
export const LazyProfileSecurity: LazyComponent<typeof import("../app/components/profile/ProfileSecurity.vue").default>
export const LazyProfileTelegramLink: LazyComponent<typeof import("../app/components/profile/ProfileTelegramLink.vue").default>
export const LazySpeedometer: LazyComponent<typeof import("../app/components/speedtest/Speedometer.vue").default>
export const LazyUiBadge: LazyComponent<typeof import("../app/components/ui/UiBadge.vue").default>
export const LazyUiButton: LazyComponent<typeof import("../app/components/ui/UiButton.vue").default>
export const LazyUiCard: LazyComponent<typeof import("../app/components/ui/UiCard.vue").default>
export const LazyUiEmptyState: LazyComponent<typeof import("../app/components/ui/UiEmptyState.vue").default>
export const LazyUiErrorState: LazyComponent<typeof import("../app/components/ui/UiErrorState.vue").default>
export const LazyUiInput: LazyComponent<typeof import("../app/components/ui/UiInput.vue").default>
export const LazyUiModal: LazyComponent<typeof import("../app/components/ui/UiModal.vue").default>
export const LazyUiRelativeTime: LazyComponent<typeof import("../app/components/ui/UiRelativeTime.vue").default>
export const LazyUiSelect: LazyComponent<typeof import("../app/components/ui/UiSelect.vue").default>
export const LazyUiSkeleton: LazyComponent<typeof import("../app/components/ui/UiSkeleton.vue").default>
export const LazyUiTextarea: LazyComponent<typeof import("../app/components/ui/UiTextarea.vue").default>
export const LazyUiToggle: LazyComponent<typeof import("../app/components/ui/UiToggle.vue").default>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/welcome.vue").default>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-layout").default>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue").default>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/client-only").default>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/dev-only").default>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/server-placeholder").default>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-link").default>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-loading-indicator").default>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-time.vue").default>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-route-announcer").default>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtImg>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtPicture>
export const LazyIcon: LazyComponent<typeof import("../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.1_vite@7.3.1_@types+node@25.0.10_jiti@2.6.1_terser@5.46.0_yaml@2.8.2__vue@3.5.27/node_modules/@nuxt/icon/dist/runtime/components/index").default>
export const LazyColorScheme: LazyComponent<typeof import("../node_modules/.pnpm/@nuxtjs+color-mode@4.0.0_magicast@0.5.1/node_modules/@nuxtjs/color-mode/dist/runtime/component.vue").default>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/pages/runtime/page").default>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").NoScript>
export const LazyLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Link>
export const LazyBase: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Base>
export const LazyTitle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Title>
export const LazyMeta: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Meta>
export const LazyStyle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Style>
export const LazyHead: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Head>
export const LazyHtml: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Html>
export const LazyBody: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Body>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-island").default>

export const componentNames: string[]
