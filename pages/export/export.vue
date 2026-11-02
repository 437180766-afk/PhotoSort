<template>
  <view class="page">
    <view class="intro">将照片副本保存到 Pictures/PhotoSort 下对应分类文件夹，原图保持不变。</view>
    <view v-for="group in groups" :key="group.category" class="group">
      <view class="group-title">
        <text>{{ group.category }}</text>
        <text class="count">{{ group.photos.length }} 张</text>
      </view>
      <button class="copy-button" :disabled="busy" @click="exportGroup(group)">
        {{ buttonText(group) }}
      </button>
    </view>
    <view v-if="!groups.length" class="empty">请先扫描相册并完成分类。</view>
  </view>
</template>

<script>
import { copyPhotosToAlbum, requestExportPermission } from '../../src/services/android-gallery'

export default {
  data() {
    return {
      photos: [],
      busy: false,
      busyCategory: ''
    }
  },
  computed: {
    groups() {
      const byCategory = {}
      this.photos.forEach(photo => {
        if (!byCategory[photo.category]) byCategory[photo.category] = []
        byCategory[photo.category].push(photo)
      })
      return Object.keys(byCategory).map(category => ({ category, photos: byCategory[category] }))
    }
  },
  onShow() {
    this.photos = getApp().globalData.photos || []
  },
  methods: {
    buttonText(group) {
      return this.busyCategory === group.category ? '正在复制…' : `复制到「${group.category}」相簿`
    },
    async exportGroup(group) {
      this.busy = true
      this.busyCategory = group.category
      try {
        await requestExportPermission()
        const count = await copyPhotosToAlbum(group.photos, group.category)
        uni.showToast({ title: `已复制 ${count} 张`, icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '复制失败', icon: 'none', duration: 3000 })
      } finally {
        this.busy = false
        this.busyCategory = ''
      }
    }
  }
}
</script>

<style>
.page { padding: 26rpx; }
.intro { margin-bottom: 24rpx; padding: 26rpx; border-radius: 16rpx; background: #fff; color: #68717e; font-size: 27rpx; line-height: 1.6; }
.group { margin-bottom: 18rpx; padding: 24rpx; border-radius: 16rpx; background: #fff; }
.group-title { display: flex; justify-content: space-between; font-size: 30rpx; font-weight: 600; }
.count { color: #7a8491; font-size: 25rpx; font-weight: 400; }
.copy-button { margin-top: 20rpx; background: #2867e8; color: #fff; font-size: 27rpx; }
.copy-button[disabled] { opacity: .6; }
.empty { padding: 70rpx 20rpx; color: #7a8491; text-align: center; }
</style>
