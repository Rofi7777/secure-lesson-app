# 查找域名注册商和配置 DNS

## 情况说明

域名 `banahillsluckyspin.chat` 已从 Netlify 项目中移除，需要找到实际注册商来配置 DNS。

## 步骤 1: 检查 Netlify 账户级别

域名可能还在您的 Netlify 账户中，只是不在项目里：

1. 在 Netlify Dashboard 中，点击右上角的**用户头像/账户设置**
2. 查找 **Domain management** 或 **Domains** 选项
3. 查看是否有账户级别的域名管理
4. 如果找到 `banahillsluckyspin.chat`，可以在那里配置 DNS

## 步骤 2: 查找域名实际注册商

### 方法 A: 使用在线工具

访问以下网站查询域名信息：

1. **WHOIS 查询**：
   - https://whois.net
   - https://www.whois.com
   - 输入：`banahillsluckyspin.chat`
   - 查看 "Registrar" 字段

2. **ICANN Lookup**：
   - https://lookup.icann.org
   - 输入域名查询

### 方法 B: 使用终端命令

在终端运行：

```bash
# 查看域名注册信息
whois banahillsluckyspin.chat

# 或使用 dig 查看当前 DNS
dig banahillsluckyspin.chat +short
```

## 步骤 3: 常见注册商

如果域名是通过 Netlify 购买的，可能是以下注册商之一：

- **Tucows/OpenSRS** - Netlify 最常用的注册商
- **Name.com**
- **GoDaddy**（某些情况下）
- **其他合作伙伴**

## 步骤 4: 在注册商处配置 DNS

找到注册商后：

### 如果注册商提供 DNS 管理

1. 登录注册商网站
2. 找到域名管理或 DNS 设置
3. 添加以下记录：

**A 记录（根域名）：**
- Type: **A**
- Name: **@** 或留空
- Value: **216.198.79.1**
- TTL: **3600**

**CNAME 记录（www 子域名，可选）：**
- Type: **CNAME**
- Name: **www**
- Value: **cname.vercel-dns.com**
- TTL: **3600**

### 如果注册商支持更改 Nameservers

更改为 Vercel 的 Nameservers：
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

## 步骤 5: 在 Vercel 中验证

1. 在 Vercel Dashboard 的 **Settings > Domains** 页面
2. 找到 `banahillsluckyspin.chat`
3. 点击 **Refresh** 检查状态
4. 等待 DNS 传播（5-30 分钟）

## 快速检查命令

配置完成后，验证 DNS：

```bash
# 检查 A 记录
dig banahillsluckyspin.chat +short
# 应该返回: 216.198.79.1

# 检查 Nameservers
dig NS banahillsluckyspin.chat +short
```

