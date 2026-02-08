import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";

type Props = {
  onBack: () => void;
};

const HELP_IMAGES = [
  require("../../assets/help/img01.png"),
  require("../../assets/help/img02.png"),
];

export default function HelpScreen({ onBack }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>How to play</Text>
        {/* Spacer to balance layout */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {/* Intro */}
        <Text style={styles.h1}>Blueberry Puzzle</Text>
        <Text style={styles.p}>
          The rules of the game are simple: exactly three berries per 3×3 square,
          per line, and per column. A number shows how many berries are
          neighbouring the cell, including diagonal cells.
        </Text>

        <View style={styles.hr} />

        {/* Section 1 */}
        <Text style={styles.h2}>Reading the numbers</Text>
        <Text style={styles.p}>
          A number is a clue. It counts berries in the 8 surrounding cells (up,
          down, left, right, and diagonals). The clue cell itself never contains
          a berry.
        </Text>

        <View style={styles.figure}>
          <Image source={HELP_IMAGES[0]} style={styles.image} resizeMode="contain" />
          <Text style={styles.caption}>
            Example 1. Use the clue to reason about the neighbouring cells.
          </Text>
        </View>

        <Text style={styles.p}>
          Here the number <Text style={styles.bold}>3</Text> tells us that 3 out
          of the 4 neighbouring cells contain berries. However, out of the two
          cells outlined with red, at most one can have a berry — otherwise there
          would be too many berries next to the cell with number{" "}
          <Text style={styles.bold}>1</Text> on it. Thus we can surely say that
          both the bottom neighbours of the number{" "}
          <Text style={styles.bold}>3</Text> contain berries.
        </Text>

        <View style={styles.hr} />

        {/* Section 2 */}
        <Text style={styles.h2}>Combine local constraints</Text>
        <Text style={styles.p}>
          Most moves come from combining several clues. When one clue restricts
          where berries can go, it often forces berries elsewhere nearby.
        </Text>

        <View style={styles.figure}>
          <Image source={HELP_IMAGES[1]} style={styles.image} resizeMode="contain" />
          <Text style={styles.caption}>Example 2. Combine two nearby clues.</Text>
        </View>

        <Text style={styles.p}>
          The bottom row already contains two berries.
          At the same time, the right 3×3 square must contain one additional berry in that same bottom row.
          This means that all three berries for the bottom row are already accounted for.
          Therefore, the bottom row of the middle 3×3 square cannot contain any berries.
          As a result, the two highlighted cells can be marked as empty.
        </Text>
        
        <View style={styles.hr} />

        {/* Controls */}
        <Text style={styles.h2}>Controls</Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            • Tap an empty cell: cycles <Text style={styles.bold}>berry</Text> →{" "}
            <Text style={styles.bold}>X</Text> → empty.
          </Text>
          <Text style={styles.bullet}>• Undo / Redo: revert or re-apply moves.</Text>
          <Text style={styles.bullet}>• Clear: removes all your marks.</Text>
          <Text style={styles.bullet}>
            • Check: enabled when you placed exactly 27 berries.
          </Text>
        </View>

        <View style={styles.footerSpace} />

        {/* Bottom Back button (obvious way out even after long scroll) */}
        <Pressable style={styles.backButtonBottom} onPress={onBack}>
          <Text style={styles.backButtonBottomText}>← Back to start</Text>
        </Pressable>

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingBottom: 24,
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

  callout: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  calloutText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
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

  backButtonBottom: {
    alignSelf: "stretch",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  backButtonBottomText: {
    color: "#fff",
    fontWeight: "800",
  },

  footerSpace: {
    height: 14,
  },
});
