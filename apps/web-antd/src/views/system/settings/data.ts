import type { VbenFormSchema } from '#/adapter/form';

export function systemInfoSchema(timezoneOptions: any[]): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'systemName',
      label: '系统名称',
      rules: 'required',
      componentProps: { placeholder: '请输入系统名称' },
    },
    {
      component: 'Input',
      fieldName: 'companyName',
      label: '公司全称',
      rules: 'required',
      componentProps: { placeholder: '请输入公司全称' },
    },
    {
      component: 'Select',
      fieldName: 'timezone',
      label: '默认时区',
      rules: 'selectRequired',
      componentProps: {
        options: timezoneOptions,
        class: 'w-full',
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'defaultPageSize',
      label: '默认分页条数',
      componentProps: { min: 10, max: 100, precision: 0, class: 'w-full' },
      help: '列表首次打开时使用，范围 10—100 条',
    },
    {
      component: 'InputNumber',
      fieldName: 'maxUploadSizeMb',
      label: '附件大小上限',
      componentProps: {
        min: 1,
        max: 500,
        precision: 0,
        addonAfter: 'MB',
        class: 'w-full',
      },
      help: '文件上传接口会同步执行大小校验',
    },
  ];
}
export function securitySchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      fieldName: 'passwordMinLength',
      label: '密码最小长度',
      componentProps: { min: 8, max: 32, precision: 0, class: 'w-full' },
    },
    {
      component: 'InputNumber',
      fieldName: 'passwordMaxLength',
      label: '密码最大长度',
      componentProps: { min: 8, max: 64, precision: 0, class: 'w-full' },
    },
    {
      component: 'Switch',
      fieldName: 'passwordRequireLettersAndNumbers',
      label: '字母与数字组合',
      componentProps: { checkedChildren: '启用', unCheckedChildren: '关闭' },
      help: '启用后，新密码必须同时包含字母和数字',
    },
    {
      component: 'InputNumber',
      fieldName: 'maxLoginFailures',
      label: '连续失败锁定',
      componentProps: {
        min: 3,
        max: 10,
        precision: 0,
        addonAfter: '次',
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'lockMinutes',
      label: '账号锁定时长',
      componentProps: {
        min: 5,
        max: 1440,
        precision: 0,
        addonAfter: '分钟',
        class: 'w-full',
      },
    },
  ];
}
export function logSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RadioGroup',
      fieldName: 'logMode',
      label: '日志记录模式',
      componentProps: {
        optionType: 'button',
        buttonStyle: 'solid',
        options: [
          { label: '重要日志', value: 'important' },
          { label: '详细日志', value: 'detailed' },
        ],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'detailModeHours',
      label: '详细模式时长',
      componentProps: {
        min: 1,
        max: 168,
        precision: 0,
        addonAfter: '小时',
        class: 'w-full',
      },
      dependencies: {
        show: (values) => values.logMode === 'detailed',
        triggerFields: ['logMode'],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'logRetentionDays',
      label: '日志保留时间',
      componentProps: {
        min: 0,
        max: 3650,
        precision: 0,
        addonAfter: '天',
        class: 'w-full',
      },
      help: '填写 0 表示无限期保留',
    },
  ];
}
