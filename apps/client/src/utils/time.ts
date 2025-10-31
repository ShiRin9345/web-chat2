/**
 * 格式化相对时间
 * @param date 要格式化的时间
 * @returns 格式化后的时间字符串
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过一周显示具体日期
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}
