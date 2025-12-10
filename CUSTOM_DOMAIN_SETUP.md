# 自定义域名设置指南

## 使用域名：banahillsluckyspin.chat

### 方法一：使用 Vercel DNS（推荐）

#### 步骤 1: 在域名注册商更改 Nameservers

1. **登录您的域名注册商**（例如：GoDaddy、Namecheap、Cloudflare 等）
2. **找到 DNS 管理或 Nameservers 设置**
3. **将 Nameservers 更改为：**
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

4. **保存更改**

#### 步骤 2: 在 Vercel 中配置

1. 在 Vercel Dashboard 的 **Settings > Domains** 页面
2. 找到 `banahillsluckyspin.chat`
3. 点击 **Vercel DNS** 标签
4. 点击 **Refresh** 按钮检查状态
5. 等待 DNS 传播（通常 5-30 分钟，最多 48 小时）

---

### 方法二：使用 DNS Records（如果不想更改 Nameservers）

#### 步骤 1: 在域名注册商添加 A 记录

1. **登录您的域名注册商**
2. **找到 DNS 管理或 DNS 记录设置**
3. **添加以下 A 记录：**
   - **Type**: A
   - **Name**: @ (或留空，表示根域名)
   - **Value**: `216.198.79.1`
   - **TTL**: 3600 (或默认值)

4. **保存更改**

#### 步骤 2: 添加 www 子域名（可选）

如果需要 `www.banahillsluckyspin.chat` 也能访问：

- **Type**: CNAME
- **Name**: www
- **Value**: `cname.vercel-dns.com`
- **TTL**: 3600

#### 步骤 3: 在 Vercel 中验证

1. 在 Vercel Dashboard 的 **Settings > Domains** 页面
2. 找到 `banahillsluckyspin.chat`
3. 点击 **DNS Records** 标签
4. 点击 **Refresh** 按钮检查状态
5. 等待 DNS 传播

---

## 验证配置

### 检查 DNS 是否生效

在终端运行：

```bash
# 检查 A 记录
dig banahillsluckyspin.chat +short

# 或使用 nslookup
nslookup banahillsluckyspin.chat
```

应该返回：`216.198.79.1`

### 检查域名状态

1. 在 Vercel Dashboard 中查看域名状态
2. 当状态从 "Invalid Configuration" 变为 "Valid Configuration" 时，说明配置成功

---

## 常见问题

### Q: DNS 更改后多久生效？

**A:** 通常 5-30 分钟，但可能需要最多 48 小时才能全球生效。

### Q: 如何知道 DNS 是否已生效？

**A:** 
1. 在 Vercel Dashboard 中，域名状态会变为 "Valid Configuration"
2. 使用 `dig` 或 `nslookup` 命令检查
3. 尝试访问 `https://banahillsluckyspin.chat`

### Q: 是否需要配置 SSL 证书？

**A:** 不需要！Vercel 会自动为您的域名配置免费的 SSL 证书（HTTPS）。

### Q: www 子域名如何处理？

**A:** 
- 如果使用方法一（Vercel DNS），Vercel 会自动处理
- 如果使用方法二，需要添加 CNAME 记录指向 `cname.vercel-dns.com`

### Q: 可以同时使用两种方法吗？

**A:** 不可以，只能选择一种方法。推荐使用方法一（Vercel DNS），更简单且功能更完整。

---

## 完成后的访问

配置完成后，您可以通过以下 URL 访问应用：

- `https://banahillsluckyspin.chat`
- `https://www.banahillsluckyspin.chat`（如果配置了）

Vercel 会自动处理 HTTPS 重定向。

---

## 需要帮助？

如果遇到问题：
1. 检查 DNS 记录是否正确
2. 等待 DNS 传播时间
3. 查看 Vercel Dashboard 中的错误信息
4. 检查域名注册商的 DNS 设置

