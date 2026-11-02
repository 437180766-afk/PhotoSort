# PhotoSort

面向 Android 的本地相册整理 uni-app 项目。照片扫描、规则分类、重复/废片检查和导出都在设备上执行，不会将图片发送到网络服务。

## 功能

- 扫描 Android 系统图片媒体库，读取可用的拍摄时间、相机型号、GPS、尺寸和文件名。
- 离线 OCR 文字命中规则按「票据 > 证件 > 医疗 > 文档 > 生活」分类；截图单独优先判断。用户可手动修改分类。
- 按拍摄时间和 GPS 位置进行 DBSCAN 出游聚类（距离 250 米、时间间隔 4 小时、最少 2 张）。
- 使用 MD5 标记完全重复照片；按缩略采样像素标记尺寸过小、疑似全黑或纯白照片。只标记，不删除。
- 将所选分类的照片副本写入系统相册的 `Pictures/PhotoSort/<分类>`，保留原图。

## 开发环境

- Windows 10/11
- [HBuilderX](https://www.dcloud.io/hbuilderx.html)，安装 App 开发版及 Android 真机运行/云打包支持
- Android 7.0 或更高版本真机；首次运行需要授予照片读取权限，Android 9 及更早版本在导出时另外申请写入权限
- PaddleOCR 中文轻量模型与兼容的本地 WASM 运行时（单独准备，见 [static/ocr/README.md](./static/ocr/README.md)）

## 拉取与导入

```sh
git clone https://github.com/437180766-afk/PhotoSort.git
```

在 HBuilderX 中选择「文件 → 导入 → 从本地目录导入」，选择仓库目录。打开 `manifest.json`，在 HBuilderX 中配置应用标识（云打包要求使用自己的 AppID）。

## 真机运行

1. 手机开启开发者选项和 USB 调试，并连接电脑；按设备提示授权调试。
2. 在 HBuilderX 选择「运行 → 运行到手机或模拟器 → 运行到 Android App 基座」。
3. 首次扫描时允许 PhotoSort 读取照片；Android 9 及更早版本在首次导出时还需允许写入照片。
4. OCR 需将 `det`、`rec`、`keys.txt`、本地 WASM runtime 及 `paddleocr.js` 适配器放到 `static/ocr`。缺少这些资源时，应用会明确提示文字识别不可用，照片扫描和非 OCR 规则仍可使用。

## 云打包 APK

1. 在 `manifest.json` 中填写应用名称、图标、版本及自己的 AppID。
2. 确认 OCR runtime 和模型已随应用本地提供（资源较大时注意云打包体积限制）。
3. HBuilderX 选择「发行 → 原生 App-云打包」，选择 Android，按需选择自有证书或云端证书，提交打包并下载 APK。
4. 安装 APK 后在系统权限弹窗中授予「照片和视频」访问权限。Android 9 及更低版本需要读取权限，并在导出时申请写入权限；Android 10 及以上通过 MediaStore 新建并写入导出副本。

## 分类规则

| 顺序 | 分类 | 示例关键词 |
|---|---|---|
| 单独优先 | 屏幕截图 | 截图、验证码、聊天记录；或系统文件名含截图 |
| 1 | 票据 | 增值税发票、发票、税号、小写、收款、付款、小票、微信支付、支付宝、订单、收据 |
| 2 | 证件 | 身份证、公民身份号码、驾驶证、银行卡、卡号、姓名、民族、住址 |
| 3 | 医疗 | 化验单、检验报告、CT、X 光、血常规、肝功能、病历、处方、药品 |
| 4 | 文档 | 附件、页码、说明、合同、笔记、纸质资料 |
| 兜底 | 生活 | 美食、风景、宠物、人像自拍等未命中内容 |

规则只对本地 OCR 结果做关键词匹配，不使用大模型。分类结果可在预览页手动修改。

## 注意事项

- 当前版本面向 Android，不包含 iOS 相册访问适配。
- Android/设备厂商对媒体文件路径和 EXIF 的可见性不同；无法读取路径的照片仍可能出现在列表中并可通过媒体 URI 导出，但 EXIF、MD5 或像素检查可能不可用。
- 扫描大相册会消耗时间和设备资源。请保持应用在前台并确保设备有足够存储空间。
- 导出操作只复制到新相簿；如系统拒绝媒体库写入，请检查系统权限和设备存储空间。
- OCR 模型和运行时由使用者单独准备。不得将图片或 OCR 内容发送到第三方服务。

## HBuilderX 浏览器预览与真机联调

### 浏览器 H5 预览

1. 启动 HBuilderX，选择「文件 → 打开目录」，打开本仓库。
2. 选择「运行 → 运行到浏览器」，或在 PowerShell 中使用 HBuilderX CLI：

   ```powershell
   $hbuilderx = "D:\你的HBuilderX安装目录\HBuilderX"
   & "$hbuilderx\cli.exe" launch web --project "D:\workspace\PhotoSort" --browser Chrome
   ```

3. 查看 HBuilderX 控制台输出的本机地址和端口。例如输出 `http://localhost:8080/` 时，在电脑浏览器打开该地址。保存代码后，开发服务器会热更新页面。
4. 浏览器调试页面布局和路由时，可使用浏览器开发者工具；也可在 HBuilderX 控制台使用调试按钮查看运行日志。

H5 预览用于检查界面和路由，浏览器不提供 Android 原生相册、`plus.android` 或 Android 权限 API。点击扫描时看到「请在 HBuilderX Android 真机基座或 APK 中运行」是预期行为，不代表 Android 功能已经验证。

### 同一 Wi-Fi 下用手机浏览器预览

1. 电脑和手机连接同一个可信任的 Wi-Fi；不要使用访客网络或移动数据。
2. 在电脑运行 `ipconfig`，找到正在使用的无线网卡 IPv4 地址，例如 `192.168.1.23`。
3. 从 HBuilderX 控制台确认 H5 预览端口（例如 `8080`），在手机浏览器访问 `http://电脑IPv4地址:端口/`，例如 `http://192.168.1.23:8080/`。手机上的 `localhost` 指向手机本身，不能用来访问电脑。
4. 如果 HBuilderX 显示 `Network: unavailable`、手机无法打开页面，先确认电脑和手机处于同一网段，并允许 HBuilderX/Node.js 在 Windows Defender 防火墙的**专用网络**上接收连接；VPN、代理或路由器客户端隔离也可能阻断访问。重启 H5 预览后按控制台显示的 Network 地址测试。
5. H5 开发服务只用于可信任的本地网络联调，不要将开发端口暴露到公网。

手机浏览器仍是 H5 环境，只能检查页面展示和浏览器行为，不能替代 Android App 基座测试相册扫描、EXIF、权限、离线 OCR 或系统相簿导出。

### Android 真机基座调试

1. 手机开启开发者选项和 USB 调试，通过可传输数据的 USB 线连接电脑，并在手机弹窗中允许这台电脑调试。
2. HBuilderX 中选择「运行 → 运行到手机或模拟器 → 运行到 Android App 基座」，等待编译和安装完成。也可以在 PowerShell 查看设备是否被识别：

   ```powershell
   $hbuilderx = "D:\你的HBuilderX安装目录\HBuilderX"
   & "$hbuilderx\cli.exe" devices list --platform android
   ```

3. HBuilderX CLI 运行方式（设备已通过 USB 调试授权）：

   ```powershell
   & "$hbuilderx\cli.exe" launch app-android --project "D:\workspace\PhotoSort"
   ```

4. 在基座内授予照片读取权限，点击首页「扫描并开始分类」；检查扫描结果、分类修改、预览及导出。Android 9 及更早版本会在导出时另外申请写入权限。首次安装、权限改变或设备行为与预期不同时，在系统设置中检查 PhotoSort 的照片权限。
5. 运行期间在 HBuilderX 控制台查看编译错误、JavaScript 日志和原生运行日志。若电脑已连接多台设备，先在设备列表确定目标设备，并在运行设备选择中指定它。

H5 与 App 是两种不同的运行目标：桌面/手机浏览器适合检查 H5 UI；USB Android App 基座才可验证本项目的 Android 相册与 MediaStore 功能。基座运行成功也不等同于最终发行 APK 已验证，发布前应安装实际打出的 APK 再完整走一次流程。

## Android APK 云打包与安装

1. 用 HBuilderX 打开 `manifest.json` 的可视化配置，配置应用名称、图标、版本，并将占位 AppID `__UNI__PHOTOSORT` 替换为自己的 DCloud AppID。不要将密钥或证书密码提交到仓库。
2. 检查 Android 权限配置：图片读取权限用于扫描本机相册；Android 9 及更早版本需要在导出时申请外部存储写权限。Android 10 及更新版本通过 MediaStore 写入照片副本。不要为了相册功能额外申请无关的通讯录、位置或录音权限。
3. 若需要离线文字分类，先按 [static/ocr/README.md](./static/ocr/README.md) 放入本地 PaddleOCR WASM runtime、适配器和 det/rec/keys 模型。模型不在仓库中；未添加时仍可打包，但 OCR 文字分类不可用。
4. 选择「发行 → 原生 App-云打包」，选择 Android，并按发布场景使用云端测试证书或自己的正式签名证书，提交打包。下载生成的 APK；测试包只用于测试，正式发布应使用妥善保管的正式签名证书，并为后续版本保持一致。
5. 将 APK 传到 Android 手机安装。若系统提示未知来源安装，仅为本次可信 APK 临时允许安装；启动后授予照片读取权限。执行分类导出时检查系统相册中是否出现 `Pictures/PhotoSort/<分类>` 副本，并确认原图仍保留。
6. 如果打包失败，先查看 HBuilderX 云打包任务的完整错误、确认 AppID、网络状态、Android 配置和证书，再按错误信息修复后重新提交。不要将证书密码或私钥粘贴到日志或公开 issue。

### 联调常见问题

| 现象 | 检查方式 |
|---|---|
| CLI 提示找不到项目或未导入 | 先在 HBuilderX 打开仓库，再使用项目绝对路径运行 CLI。 |
| 浏览器有页面，扫描提示必须在 Android | 这是 H5 不支持 `plus.android` 的平台差异；改用 Android App 基座或 APK。 |
| 手机浏览器无法访问电脑 H5 | 使用电脑的局域网 IPv4 地址和控制台显示的端口；检查同一 Wi-Fi、专用网络防火墙和路由器隔离设置。 |
| HBuilderX 找不到 Android 手机 | 检查 USB 数据线、手机 USB 调试授权和设备驱动；重新插拔后在设备列表确认。 |
| 扫描结果为空或 EXIF 缺失 | 检查系统照片读取权限、设备媒体库索引、图片格式及设备对文件路径/EXIF 的限制。 |
| OCR 不可用 | 检查 `static/ocr` 中本地适配器、WASM runtime、模型与字典是否完整且路径匹配；应用不会调用云端 OCR 作为回退。 |
| 导出失败 | 检查相册写权限（Android 9 及更早版本）、设备可用空间和系统相册访问限制。 |

### 隐私设置

`manifest.json` 已显式设置 `"uniStatistics": { "enable": false }`，关闭 uni 统计，避免应用为了统计向外部服务发送页面/设备统计信息。调试时如果控制台仍显示启用了 uni 统计，请核对当前实际打开的项目、统计开关及其子平台覆盖配置后重新编译。浏览器调试工具或 HBuilderX 自身也可能产生与应用照片处理无关的开发者工具网络请求；不要把本机照片或 OCR 结果放入网络日志、第三方调试服务或在线示例。
