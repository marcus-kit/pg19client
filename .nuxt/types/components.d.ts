
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

interface _GlobalComponents {
  'CommunityContextMenu': typeof import("../../app/components/community/CommunityContextMenu.vue").default
  'CommunityMessage': typeof import("../../app/components/community/CommunityMessage.vue").default
  'CommunityMessageInput': typeof import("../../app/components/community/CommunityMessageInput.vue").default
  'CommunityMuteModal': typeof import("../../app/components/community/CommunityMuteModal.vue").default
  'CommunityPinnedMessages': typeof import("../../app/components/community/CommunityPinnedMessages.vue").default
  'CommunityReportModal': typeof import("../../app/components/community/CommunityReportModal.vue").default
  'CommunityTypingIndicator': typeof import("../../app/components/community/CommunityTypingIndicator.vue").default
  'DashboardBalanceCard': typeof import("../../app/components/dashboard/DashboardBalanceCard.vue").default
  'DashboardConnectedServices': typeof import("../../app/components/dashboard/DashboardConnectedServices.vue").default
  'DashboardConnectionCard': typeof import("../../app/components/dashboard/DashboardConnectionCard.vue").default
  'DashboardConnectionProfile': typeof import("../../app/components/dashboard/DashboardConnectionProfile.vue").default
  'DashboardNewsModal': typeof import("../../app/components/dashboard/DashboardNewsModal.vue").default
  'DashboardReferralCard': typeof import("../../app/components/dashboard/DashboardReferralCard.vue").default
  'ProfileAchievements': typeof import("../../app/components/profile/ProfileAchievements.vue").default
  'ProfileAddressInfo': typeof import("../../app/components/profile/ProfileAddressInfo.vue").default
  'ProfileAvatar': typeof import("../../app/components/profile/ProfileAvatar.vue").default
  'ProfileContactInfo': typeof import("../../app/components/profile/ProfileContactInfo.vue").default
  'ProfileContractInfo': typeof import("../../app/components/profile/ProfileContractInfo.vue").default
  'ProfileNotifications': typeof import("../../app/components/profile/ProfileNotifications.vue").default
  'ProfilePersonalInfo': typeof import("../../app/components/profile/ProfilePersonalInfo.vue").default
  'ProfileReferral': typeof import("../../app/components/profile/ProfileReferral.vue").default
  'ProfileSecurity': typeof import("../../app/components/profile/ProfileSecurity.vue").default
  'ProfileTelegramLink': typeof import("../../app/components/profile/ProfileTelegramLink.vue").default
  'Speedometer': typeof import("../../app/components/speedtest/Speedometer.vue").default
  'UiBadge': typeof import("../../app/components/ui/UiBadge.vue").default
  'UiButton': typeof import("../../app/components/ui/UiButton.vue").default
  'UiCard': typeof import("../../app/components/ui/UiCard.vue").default
  'UiEmptyState': typeof import("../../app/components/ui/UiEmptyState.vue").default
  'UiErrorState': typeof import("../../app/components/ui/UiErrorState.vue").default
  'UiInput': typeof import("../../app/components/ui/UiInput.vue").default
  'UiModal': typeof import("../../app/components/ui/UiModal.vue").default
  'UiRelativeTime': typeof import("../../app/components/ui/UiRelativeTime.vue").default
  'UiSelect': typeof import("../../app/components/ui/UiSelect.vue").default
  'UiSkeleton': typeof import("../../app/components/ui/UiSkeleton.vue").default
  'UiTextarea': typeof import("../../app/components/ui/UiTextarea.vue").default
  'UiToggle': typeof import("../../app/components/ui/UiToggle.vue").default
  'NuxtWelcome': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/welcome.vue").default
  'NuxtLayout': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-layout").default
  'NuxtErrorBoundary': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue").default
  'ClientOnly': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/client-only").default
  'DevOnly': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/dev-only").default
  'ServerPlaceholder': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/server-placeholder").default
  'NuxtLink': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-link").default
  'NuxtLoadingIndicator': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-loading-indicator").default
  'NuxtTime': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-time.vue").default
  'NuxtRouteAnnouncer': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-route-announcer").default
  'NuxtImg': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtImg
  'NuxtPicture': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtPicture
  'Icon': typeof import("../../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.1_vite@7.3.1_@types+node@25.0.10_jiti@2.6.1_terser@5.46.0_yaml@2.8.2__vue@3.5.27/node_modules/@nuxt/icon/dist/runtime/components/index").default
  'ColorScheme': typeof import("../../node_modules/.pnpm/@nuxtjs+color-mode@4.0.0_magicast@0.5.1/node_modules/@nuxtjs/color-mode/dist/runtime/component.vue").default
  'NuxtPage': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/pages/runtime/page").default
  'NoScript': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").NoScript
  'Link': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Link
  'Base': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Base
  'Title': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Title
  'Meta': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Meta
  'Style': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Style
  'Head': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Head
  'Html': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Html
  'Body': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Body
  'NuxtIsland': typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-island").default
  'LazyCommunityContextMenu': LazyComponent<typeof import("../../app/components/community/CommunityContextMenu.vue").default>
  'LazyCommunityMessage': LazyComponent<typeof import("../../app/components/community/CommunityMessage.vue").default>
  'LazyCommunityMessageInput': LazyComponent<typeof import("../../app/components/community/CommunityMessageInput.vue").default>
  'LazyCommunityMuteModal': LazyComponent<typeof import("../../app/components/community/CommunityMuteModal.vue").default>
  'LazyCommunityPinnedMessages': LazyComponent<typeof import("../../app/components/community/CommunityPinnedMessages.vue").default>
  'LazyCommunityReportModal': LazyComponent<typeof import("../../app/components/community/CommunityReportModal.vue").default>
  'LazyCommunityTypingIndicator': LazyComponent<typeof import("../../app/components/community/CommunityTypingIndicator.vue").default>
  'LazyDashboardBalanceCard': LazyComponent<typeof import("../../app/components/dashboard/DashboardBalanceCard.vue").default>
  'LazyDashboardConnectedServices': LazyComponent<typeof import("../../app/components/dashboard/DashboardConnectedServices.vue").default>
  'LazyDashboardConnectionCard': LazyComponent<typeof import("../../app/components/dashboard/DashboardConnectionCard.vue").default>
  'LazyDashboardConnectionProfile': LazyComponent<typeof import("../../app/components/dashboard/DashboardConnectionProfile.vue").default>
  'LazyDashboardNewsModal': LazyComponent<typeof import("../../app/components/dashboard/DashboardNewsModal.vue").default>
  'LazyDashboardReferralCard': LazyComponent<typeof import("../../app/components/dashboard/DashboardReferralCard.vue").default>
  'LazyProfileAchievements': LazyComponent<typeof import("../../app/components/profile/ProfileAchievements.vue").default>
  'LazyProfileAddressInfo': LazyComponent<typeof import("../../app/components/profile/ProfileAddressInfo.vue").default>
  'LazyProfileAvatar': LazyComponent<typeof import("../../app/components/profile/ProfileAvatar.vue").default>
  'LazyProfileContactInfo': LazyComponent<typeof import("../../app/components/profile/ProfileContactInfo.vue").default>
  'LazyProfileContractInfo': LazyComponent<typeof import("../../app/components/profile/ProfileContractInfo.vue").default>
  'LazyProfileNotifications': LazyComponent<typeof import("../../app/components/profile/ProfileNotifications.vue").default>
  'LazyProfilePersonalInfo': LazyComponent<typeof import("../../app/components/profile/ProfilePersonalInfo.vue").default>
  'LazyProfileReferral': LazyComponent<typeof import("../../app/components/profile/ProfileReferral.vue").default>
  'LazyProfileSecurity': LazyComponent<typeof import("../../app/components/profile/ProfileSecurity.vue").default>
  'LazyProfileTelegramLink': LazyComponent<typeof import("../../app/components/profile/ProfileTelegramLink.vue").default>
  'LazySpeedometer': LazyComponent<typeof import("../../app/components/speedtest/Speedometer.vue").default>
  'LazyUiBadge': LazyComponent<typeof import("../../app/components/ui/UiBadge.vue").default>
  'LazyUiButton': LazyComponent<typeof import("../../app/components/ui/UiButton.vue").default>
  'LazyUiCard': LazyComponent<typeof import("../../app/components/ui/UiCard.vue").default>
  'LazyUiEmptyState': LazyComponent<typeof import("../../app/components/ui/UiEmptyState.vue").default>
  'LazyUiErrorState': LazyComponent<typeof import("../../app/components/ui/UiErrorState.vue").default>
  'LazyUiInput': LazyComponent<typeof import("../../app/components/ui/UiInput.vue").default>
  'LazyUiModal': LazyComponent<typeof import("../../app/components/ui/UiModal.vue").default>
  'LazyUiRelativeTime': LazyComponent<typeof import("../../app/components/ui/UiRelativeTime.vue").default>
  'LazyUiSelect': LazyComponent<typeof import("../../app/components/ui/UiSelect.vue").default>
  'LazyUiSkeleton': LazyComponent<typeof import("../../app/components/ui/UiSkeleton.vue").default>
  'LazyUiTextarea': LazyComponent<typeof import("../../app/components/ui/UiTextarea.vue").default>
  'LazyUiToggle': LazyComponent<typeof import("../../app/components/ui/UiToggle.vue").default>
  'LazyNuxtWelcome': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/welcome.vue").default>
  'LazyNuxtLayout': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-layout").default>
  'LazyNuxtErrorBoundary': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue").default>
  'LazyClientOnly': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/client-only").default>
  'LazyDevOnly': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/dev-only").default>
  'LazyServerPlaceholder': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/server-placeholder").default>
  'LazyNuxtLink': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-link").default>
  'LazyNuxtLoadingIndicator': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-loading-indicator").default>
  'LazyNuxtTime': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-time.vue").default>
  'LazyNuxtRouteAnnouncer': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-route-announcer").default>
  'LazyNuxtImg': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtImg>
  'LazyNuxtPicture': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-stubs").NuxtPicture>
  'LazyIcon': LazyComponent<typeof import("../../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.1_vite@7.3.1_@types+node@25.0.10_jiti@2.6.1_terser@5.46.0_yaml@2.8.2__vue@3.5.27/node_modules/@nuxt/icon/dist/runtime/components/index").default>
  'LazyColorScheme': LazyComponent<typeof import("../../node_modules/.pnpm/@nuxtjs+color-mode@4.0.0_magicast@0.5.1/node_modules/@nuxtjs/color-mode/dist/runtime/component.vue").default>
  'LazyNuxtPage': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/pages/runtime/page").default>
  'LazyNoScript': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").NoScript>
  'LazyLink': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Link>
  'LazyBase': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Base>
  'LazyTitle': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Title>
  'LazyMeta': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Meta>
  'LazyStyle': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Style>
  'LazyHead': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Head>
  'LazyHtml': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Html>
  'LazyBody': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/head/runtime/components").Body>
  'LazyNuxtIsland': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@4.2.2_@parcel+watcher@2.5.4_@types+node@25.0.10_@vue+compiler-sfc@3.5.27_cac@6.7.1_7e158e092e44ef7f48c6306effaf518f/node_modules/nuxt/dist/app/components/nuxt-island").default>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
