<template>
  <view class="page">
    <view class="hero">
      <text class="title">让相册整理更简单</text>
      <text class="subtitle">扫描、分类和导出均在本机完成，照片不会上传。</text>
    </view>

    <view class="card">
      <text class="section-title">本地智能整理</text>
      <text class="description">读取相册照片和 EXIF 信息，结合离线 OCR 识别票据、证件、医疗及文档等内容。</text>
      <button class="primary-button" :disabled="scanning" @click="scanPhotos">
        {{ scanning ? '正在扫描并分类…' : '扫描并开始分类' }}
      </button>
      <text v-if="status" class="status">{{ status }}</text>
    </view>

    <view v-if="photos.length" class="summary card">
      <view class="summary-line">
        <text>已扫描照片</text>
        <text class="number">{{ photos.length }}</text>
      </view>
      <view class="summary-line">
        <text>待清理标记</text>
        <text class="number">{{ flaggedCount }}</text>
      </view>
      <button class="secondary-button" @click="openPhotos">查看分类结果</button>
      <button class="secondary-button" @click="openExport">复制到分类相簿</button>
    </view>

    <text class="notice">PhotoSort 只会标记疑似重复或废片，不会自动删除原图。导出操作会复制照片。</text>
  </view>
</template>

<script>
import { requestPhotoPermission, scanPhotos, inspectPhoto } from '../../src/services/android-gallery'
import { classifyPhoto } from '../../src/utils/classifier'
import { findTripGroups } from '../../src/utils/trips'
import { loadOfflineOcr, recognize } from '../../src/services/offline-ocr'

export default {
  data() {
    return {
      scanning: false,
      status: '',
      photos: []
    }
  },
  computed: {
    flaggedCount() {
      return this.photos.filter(photo => photo.cleanupFlags.length > 0).length
    }
  },
  onShow() {
    this.photos = getApp().globalData.photos || []
  },
  methods: {
    async scanPhotos() {
      if (this.scanning) return
      this.scanning = true
      this.status = ''
      try {
        await requestPhotoPermission()
        this.status = '正在读取本机相册…'
        const items = scanPhotos()
        const results = []
        const ocr = await loadOfflineOcr()
        getApp().globalData.ocrAvailable = ocr

        for (let index = 0; index < items.length; index += 1) {
          const item = items[index]
          this.status = `正在分析 ${index + 1} / ${items.length}`
          const inspected = await inspectPhoto(item)
          let text = ''
          if (ocr) text = await recognize(item.path, item.uri)
          const category = classifyPhoto(text, item)
          results.push({
            ...item,
            ...inspected,
            ocrText: text,
            category,
            trip: '',
            cleanupFlags: inspected.cleanupFlags
          })
          if (index % 8 === 7) await new Promise(resolve => setTimeout(resolve, 0))
        }

        const hashes = new Map()
        results.forEach(photo => {
          if (!photo.md5) return
          if (hashes.has(photo.md5)) {
            photo.cleanupFlags.push('完全重复')
            const original = hashes.get(photo.md5)
            if (original && !original.cleanupFlags.includes('完全重复')) {
              original.cleanupFlags.push('完全重复')
            }
          } else {
            hashes.set(photo.md5, photo)
          }
        })

        const tripGroups = findTripGroups(results)
        tripGroups.forEach(group => group.photoIds.forEach(id => {
          const photo = results.find(item => item.id === id)
          if (photo) photo.trip = group.name
        }))
        getApp().globalData.photos = results
        this.photos = results
        this.status = results.length
          ? `完成：${results.length} 张照片${ocr ? '' : '。未检测到离线 OCR 模型，文字分类暂不可用'}`
          : '相册中没有找到图片。'
      } catch (error) {
        this.status = error.message || '扫描失败，请检查相册权限后重试。'
        uni.showToast({ title: this.status, icon: 'none', duration: 3000 })
      } finally {
        this.scanning = false
      }
    },
    openPhotos() {
      uni.navigateTo({ url: '/pages/photos/photos' })
    },
    openExport() {
      uni.navigateTo({ url: '/pages/export/export' })
    }
  }
}
</script>

<style>
.page { padding: 28rpx; }
.hero { padding: 54rpx 8rpx 40rpx; }
.title { display: block; font-size: 44rpx; font-weight: 700; }
.subtitle { display: block; margin-top: 16rpx; color: #68717e; font-size: 28rpx; line-height: 1.6; }
.card { margin-bottom: 24rpx; padding: 30rpx; border-radius: 20rpx; background: #fff; }
.section-title { display: block; font-size: 32rpx; font-weight: 600; }
.description { display: block; margin: 18rpx 0 28rpx; color: #68717e; font-size: 27rpx; line-height: 1.65; }
.primary-button, .secondary-button { margin-top: 18rpx; border-radius: 12rpx; font-size: 29rpx; }
.primary-button { background: #2867e8; color: #fff; }
.primary-button[disabled] { opacity: .6; }
.secondary-button { background: #edf2ff; color: #245bc6; }
.status { display: block; margin-top: 20rpx; color: #68717e; font-size: 25rpx; line-height: 1.5; }
.summary-line { display: flex; justify-content: space-between; padding: 10rpx 0; color: #68717e; font-size: 28rpx; }
.number { color: #20242b; font-weight: 600; }
.notice { display: block; padding: 8rpx; color: #808995; font-size: 24rpx; line-height: 1.6; }
</style>
