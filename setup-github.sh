#!/bin/bash

# GitHub 和 Vercel 部署脚本

echo "🚀 GitHub 和 Vercel 部署设置"
echo ""

# 检查是否已连接远程仓库
if git remote | grep -q origin; then
    echo "⚠️  已存在远程仓库，正在移除..."
    git remote remove origin
fi

# 获取用户输入
read -p "请输入您的 GitHub 用户名: " GITHUB_USERNAME
read -p "请输入仓库名称 (例如: secure-lesson-app): " REPO_NAME

# 设置远程仓库
GITHUB_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
echo ""
echo "📦 正在连接到 GitHub 仓库: ${GITHUB_URL}"
git remote add origin ${GITHUB_URL}

# 推送代码
echo ""
echo "📤 正在推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码已成功推送到 GitHub!"
    echo ""
    echo "📋 下一步："
    echo "1. 前往 https://vercel.com"
    echo "2. 使用 GitHub 账号登录"
    echo "3. 点击 'Add New Project'"
    echo "4. 选择仓库: ${REPO_NAME}"
    echo "5. 点击 'Deploy'"
    echo ""
    echo "🎉 完成！"
else
    echo ""
    echo "❌ 推送失败。可能的原因："
    echo "1. 仓库不存在 - 请先在 GitHub 创建仓库"
    echo "2. 认证问题 - 可能需要使用 Personal Access Token"
    echo ""
    echo "💡 提示：如果仓库不存在，请先访问："
    echo "   https://github.com/new"
    echo "   创建名为 '${REPO_NAME}' 的仓库"
fi

