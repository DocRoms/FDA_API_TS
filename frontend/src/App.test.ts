import { describe, it, expect } from 'vitest';

import App from './App.vue';
import { mount } from '@vue/test-utils';

describe('App.vue', () => {
  it('renders title', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('FDA Mini App');
  });
});

