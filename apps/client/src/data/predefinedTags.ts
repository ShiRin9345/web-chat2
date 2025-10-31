/**
 * 预定义标签数据 - 懒加载
 */

export interface PredefinedTag {
  name: string;
  displayName: string;
}

export interface PredefinedTagCategory {
  category: string;
  displayName: string;
  tags: PredefinedTag[];
}

/**
 * 懒加载预定义标签数据
 * 使用动态 import 实现代码分割和懒加载
 */
export async function loadPredefinedTags(): Promise<PredefinedTagCategory[]> {
  // 使用 Promise.all 并行加载所有分类，但只在需要时加载
  const [
    sportsModule,
    musicModule,
    technologyModule,
    readingModule,
    travelModule,
    foodModule,
    gamingModule,
    lifestyleModule,
  ] = await Promise.all([
    import("./predefinedTags/sports"),
    import("./predefinedTags/music"),
    import("./predefinedTags/technology"),
    import("./predefinedTags/reading"),
    import("./predefinedTags/travel"),
    import("./predefinedTags/food"),
    import("./predefinedTags/gaming"),
    import("./predefinedTags/lifestyle"),
  ]);

  return [
    sportsModule.default,
    musicModule.default,
    technologyModule.default,
    readingModule.default,
    travelModule.default,
    foodModule.default,
    gamingModule.default,
    lifestyleModule.default,
  ];
}
