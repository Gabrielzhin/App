import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, FlatList } from 'react-native';
import ImageView from 'react-native-image-viewing';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3; // 3 columns with padding

interface Props {
  photos: string[];
  columns?: number;
}

export default function PhotoGallery({ photos, columns = 3 }: Props) {
  const [visible, setVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const photoSize = (width - 16 * (columns + 1)) / columns;

  const openGallery = (index: number) => {
    setImageIndex(index);
    setVisible(true);
  };

  const images = photos.map((uri) => ({ uri }));

  return (
    <>
      <FlatList
        data={photos}
        numColumns={columns}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.photoItem, { width: photoSize, height: photoSize }]}
            onPress={() => openGallery(index)}
          >
            <Image source={{ uri: item }} style={styles.photo} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
      />

      <ImageView
        images={images}
        imageIndex={imageIndex}
        visible={visible}
        onRequestClose={() => setVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: 4,
  },
  photoItem: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
