//
//  NSNotificationCenter+Hook.m
//  PDebug
//
//  Created by John Wong on 2018/4/17.
//  Copyright © 2018 com. All rights reserved.
//

#import "NSNotificationCenter+Hook.h"
#import <objc/runtime.h>


@implementation NSNotificationCenter (Hook)

+ (void)load
{
    Method m1 = class_getInstanceMethod(self, @selector(postNotificationName:object:userInfo:));
    Method m2 = class_getInstanceMethod(self, @selector(hook_postNotificationName:object:userInfo:));
    method_exchangeImplementations(m1, m2);
}

- (void)hook_postNotificationName:(NSNotificationName)aName object:(id)anObject userInfo:(NSDictionary *)aUserInfo
{
    [self hook_postNotificationName:aName object:anObject userInfo:aUserInfo];
    NSLog(@"POST: %@ %@ %@", aName, anObject, aUserInfo);
}

@end
