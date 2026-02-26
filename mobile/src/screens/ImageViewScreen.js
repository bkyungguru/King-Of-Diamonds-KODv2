import React from 'react';
import {
  View, Image, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Text,
} from 'react-native';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');

export default function ImageViewScreen({ route, navigation }) {
  const { uri } = route.params;

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={s.closeText}>✕</Text>
      </TouchableOpacity>
      <ScrollView
        maximumZoomScale={5}
        minimumZoomScale={1}
        contentContainerStyle={s.scrollContent}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri }} style={s.image} resizeMode="contain" />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  closeBtn: { position: 'absolute', top: 50, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: colors.white, fontSize: 18 },
  scrollContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width, height: height * 0.8 },
});
