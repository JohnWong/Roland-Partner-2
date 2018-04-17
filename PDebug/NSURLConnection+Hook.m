//
//  NSURLConnection+Hook.m
//  PDebug
//
//  Created by John Wong on 2018/4/17.
//  Copyright © 2018 com. All rights reserved.
//

#import "NSURLConnection+Hook.h"
#import <objc/runtime.h>


@implementation NSURLConnection (Hook)

+ (void)load
{
    Method m1 = class_getClassMethod(self, @selector(sendSynchronousRequest:returningResponse:error:));
    Method m2 = class_getClassMethod(self, @selector(hook_sendSynchronousRequest:returningResponse:error:));
    method_exchangeImplementations(m1, m2);
}

+ (NSData *)hook_sendSynchronousRequest:(NSURLRequest *)request returningResponse:(NSURLResponse *__autoreleasing  _Nullable *)response error:(NSError * _Nullable __autoreleasing *)error
{
    NSData *result;
    *error = nil;
    NSString *url = nil;//request.URL.absoluteString;
    if ([url isEqualToString:@"https://mb.api.cloud.nifty.com/2013-09-01/files?where=%7B%22fileName%22:%22CE35C_0001_GL.zip%22%7D"]) {
        result = [@"{\"results\":[{\"fileName\":\"CE35C_0001_GL.zip\",\"mimeType\":\"application/x-zip-compressed\",\"fileSize\":604524,\"createDate\":\"2016-05-26T02:30:06.483Z\",\"updateDate\":\"2016-08-23T09:28:47.352Z\",\"acl\":{\"*\":{\"read\":true,\"write\":true}}}]}" dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *allHeader = @{
                                    @"Connection": @"Close",
                                    @"Content-Type": @"application/json;charset=UTF-8",
                                    @"Date": @"Tue, 17 Apr 2018 14:42:27 GMT",
                                    @"Server": @"nginx",
                                    @"Transfer-Encoding": @"Identity",
                                    @"X-Content-Type-Options": @"nosniff",
                                    @"X-NCMB-Response-Signature": @"61UonUIPgXLU8QSklNm4l78WgwE945W+kfHdn6HrM8Y="
                                    };
        *response = [[NSHTTPURLResponse alloc] initWithURL:request.URL statusCode:201 HTTPVersion:@"1.1" headerFields:allHeader];
    } else if ([url isEqualToString:@"https://mb.api.cloud.nifty.com/2013-09-01/classes/StatusLog"]) {
        result = [@"{\"createDate\":\"2018-04-17T14:26:52.353Z\",\"objectId\":\"OnWiBPUdHIi4EJtd\"}" dataUsingEncoding:NSUTF8StringEncoding];
        NSDictionary *allHeader = @{
                                    @"Connection": @"Close",
                                    @"Content-Type": @"application/json;charset=UTF-8",
                                    @"Date": @"Tue, 17 Apr 2018 14:26:52 GMT",
                                    @"Location": @"http://mb.api.cloud.nifty.com/2013-09-01/classes/StatusLog/OnWiBPUdHIi4EJtd",
                                    @"Server": @"nginx",
                                    @"Transfer-Encoding": @"Identity",
                                    @"X-Content-Type-Options": @"nosniff",
                                    @"X-NCMB-Response-Signature": @"T48TefzKIcda2xSJTgEKxVMz8ioYafvN37xJIFzkn8k="
                                    };
        *response = [[NSHTTPURLResponse alloc] initWithURL:request.URL statusCode:201 HTTPVersion:@"1.1" headerFields:allHeader];
    } else {
        result = [self hook_sendSynchronousRequest:request returningResponse:response error:error];
    }
    return result;
}

@end
