import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
};

const HELP_IMAGES = [
  require("../../assets/help/img01.png"),
  require("../../assets/help/img02.png"),
];

export default function HelpScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Tuning constants (feel free to adjust once and forget)
  const HEADER_TOP_EXTRA = 6;
  const FOOTER_BOTTOM_EXTRA = 10;

  return (
    <View style={styles.root}>
      {/* Header (sticky, safe at top) */}
      <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_EXTRA }]}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
          <Text style={styles.backButtonText}>{t("help.back")}</Text>
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {t("help.headerTitle")}
        </Text>

        {/* Spacer to balance layout */}
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Body: scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // leave room so the fixed footer never overlaps content
            paddingBottom: (insets.bottom || 0) + 24 + 52,
          },
        ]}
        showsVerticalScrollIndicator
        // helps iOS feel nicer
        contentInsetAdjustmentBehavior="never"
        // helps Android with some OEM quirks
        overScrollMode={Platform.OS === "android" ? "never" : "auto"}
      >
        {/* Intro */}
        <Text style={styles.h1}>{t("help.h1Title")}</Text>
        <Text style={styles.p}>{t("help.intro")}</Text>

        <View style={styles.hr} />

        {/* Section 1 */}
        <Text style={styles.h2}>{t("help.section1.title")}</Text>
        <Text style={styles.p}>{t("help.section1.p1")}</Text>

        <View style={styles.figure}>
          <Image source={HELP_IMAGES[0]} style={styles.image} resizeMode="contain" />
          <Text style={styles.caption}>{t("help.section1.caption1")}</Text>
        </View>

        {/* Keep the bold-number inline formatting without stuffing HTML into translations */}
        <Text style={styles.p}>
          {t("help.section1.p2.part1")} <Text style={styles.bold}>3</Text>{" "}
          {t("help.section1.p2.part2")} <Text style={styles.bold}>1</Text>{" "}
          {t("help.section1.p2.part3")} <Text style={styles.bold}>3</Text>{" "}
          {t("help.section1.p2.part4")}
        </Text>

        <View style={styles.hr} />

        {/* Section 2 */}
        <Text style={styles.h2}>{t("help.section2.title")}</Text>
        <Text style={styles.p}>{t("help.section2.p1")}</Text>

        <View style={styles.figure}>
          <Image source={HELP_IMAGES[1]} style={styles.image} resizeMode="contain" />
          <Text style={styles.caption}>{t("help.section2.caption1")}</Text>
        </View>

        <Text style={styles.p}>{t("help.section2.p2")}</Text>

        <View style={styles.hr} />

        {/* Controls */}
        <Text style={styles.h2}>{t("help.controls.title")}</Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            {t("help.controls.bullet1.part1")}{" "}
            <Text style={styles.bold}>{t("help.controls.berry")}</Text>{" "}
            {t("help.controls.bullet1.part2")} <Text style={styles.bold}>X</Text>{" "}
            {t("help.controls.bullet1.part3")}
          </Text>

          <Text style={styles.bullet}>{t("help.controls.bullet2")}</Text>
          <Text style={styles.bullet}>{t("help.controls.bullet3")}</Text>
          <Text style={styles.bullet}>{t("help.controls.bullet4", { total: 27 })}</Text>
        </View>
      </ScrollView>

      {/* Fixed footer (safe at bottom) */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: (insets.bottom || 0) + FOOTER_BOTTOM_EXTRA,
          },
        ]}
      >
        <Pressable style={styles.backButtonBottom} onPress={onBack}>
          <Text style={styles.backButtonBottomText}>{t("help.backToStart")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f5f5f5",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  backButtonText: {
    color: "#111827",
    fontWeight: "700",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
    fontSize: 16,
    paddingHorizontal: 10,
  },
  headerRightSpacer: {
    width: 70, // roughly matches back button width to keep title centered
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  h1: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  h2: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 10,
  },
  bold: {
    fontWeight: "800",
    color: "#111827",
  },

  hr: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14,
  },

  figure: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
  },

  bullets: {
    marginTop: 4,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 6,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  backButtonBottom: {
    alignSelf: "stretch",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonBottomText: {
    color: "#fff",
    fontWeight: "800",
  },
});
