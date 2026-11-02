<template>
  <view class="page">
    <view v-if="!photos.length" class="empty">请先返回首页扫描相册。</view>
    <view v-for="photo in photos" :key="photo.id" class="photo-card">
      <image class="thumbnail" :src="photo.uri" mode="aspectFill" @click="preview(photo)" />
      <view class="details">
        <view class="title-row">
          <text class="category">{{ photo.category }}</text>
          <text v-if="photo.trip" class="trip">{{ photo.trip }}</text>
        </view>
        <text class="meta">{{ photo.name }} · {{ photo.width }} × {{ photo.height }}</text>
        <text class="meta">{{ photo.takenAt || '拍摄时间未知' }}{{ photo.camera ? ` · ${photo.camera}` : '' }}</text>
        <text v-if="photo.cleanupFlags.length" class="warning">待清理：{{ photo.cleanupFlags.join('、') }}</text>
        <picker :range="categories" @change="changeCategory(photo, $event)">
          <view class="edit">修改分类</view>
        </picker>
      </view>
    </view>
  </view>
</template>

<script>
import { CATEGORIES } from '../../src/utils/classifier'

export default {
  data() {
    return {
      photos: [],
      categories: CATEGORIES
    }
  },
  onShow() {
    this.photos = getApp().globalData.photos || []
  },
  methods: {
    changeCategory(photo, event) {
      photo.category = this.categories[Number(event.detail.value)]
    },
    preview(photo) {
      uni.previewImage({
        current: photo.uri,
        urls: [photo.uri]
      })
    }
  }
}
</script>

<style>
.page { padding: 22rpx; }
.empty { padding: 80rpx 20rpx; color: #7a8491; text-align: center; }
.photo-card { display: flex; margin-bottom: 18rpx; padding: 18rpx; border-radius: 16rpx; background: #fff; }
.thumbnail { flex: none; width: 184rpx; height: 184rpx; border-radius: 12rpx; background: #eef0f3; }
.details { flex: 1; min-width: 0; padding-left: 20rpx; }
.title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10rpx; }
.category { color: #245bc6; font-size: 30rpx; font-weight: 600; }
.trip { padding: 4rpx 10rpx; border-radius: 8rpx; background: #e9f5ed; color: #267343; font-size: 22rpx; }
.meta { display: block; overflow: hidden; margin-top: 10rpx; color: #7a8491; font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }
.warning { display: block; margin-top: 10rpx; color: #bd5a13; font-size: 22rpx; }
.edit { display: inline-block; margin-top: 12rpx; color: #2867e8; font-size: 24rpx; }
</style>
