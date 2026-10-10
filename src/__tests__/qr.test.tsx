import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import QrScreen from '../../app/qr';
import { useRouter } from 'expo-router';
import { useAppActive } from '../useReadiness';
import { clearSessions, getSession } from '../session';
import { runAnalysis } from '../pipeline';
import { analyze } from '../core/analyze';
import { Button } from '../components/Button';
import { useCameraPermissions } from 'expo-camera';
import { decodeQrImage, deleteTemporaryImage, pickImage } from '../vision/images';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../useReadiness', () => ({
  useAppActive: jest.fn(),
  useReadiness: () => ({ llmLabel: 'Templates only', classifierLabel: 'Rules only' }),
}));
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(),
}));
jest.mock('../components/Screen', () => ({ Screen: 'Screen' }));
jest.mock('../pipeline', () => ({ runAnalysis: jest.fn(), runReadyExplanation: jest.fn() }));
jest.mock('../vision/images', () => ({
  pickImage: jest.fn(),
  decodeQrImage: jest.fn(),
  deleteTemporaryImage: jest.fn(),
}));

const push = jest.fn();
const requestPermission = jest.fn<() => Promise<never>>();
// React Native's renderer initialization can contend with the concurrent native build.
jest.setTimeout(30000);
let screen: ReactTestRenderer;
beforeEach(() => {
  jest.useRealTimers();
  clearSessions();
  jest.clearAllMocks();
  jest.mocked(useAppActive).mockReturnValue(true);
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: true, canAskAgain: true },
      requestPermission,
      jest.fn(),
    ] as unknown as ReturnType<typeof useCameraPermissions>);
  jest
    .mocked(useRouter)
    .mockReturnValue({ push, dismissTo: jest.fn() } as unknown as ReturnType<typeof useRouter>);
  jest.mocked(runAnalysis).mockImplementation((text) => analyze(text));
});
afterEach(async () => {
  if (screen) await act(() => screen.unmount());
  clearSessions();
});

test('duplicate camera callbacks produce an inert preview; confirmation navigates only once', async () => {
  await act(() => {
    screen = create(<QrScreen />);
  });
  const camera = screen.root.findByProps({ testID: 'qr-camera' });
  await act(() => {
    camera.props.onBarcodeScanned({ data: 'https://gcash-verify.xyz/login' });
    camera.props.onBarcodeScanned({ data: 'https://another-link.xyz' });
  });
  expect(push).not.toHaveBeenCalled();
  expect(screen.root.findAllByProps({ testID: 'qr-camera' })).toHaveLength(0);
  const check = screen.root
    .findAllByType(Button)
    .find((button) => button.props.testID === 'analyze-qr')!;
  await act(() => {
    check.props.onPress();
    check.props.onPress();
  });
  expect(push).toHaveBeenCalledTimes(1);
  const route = push.mock.calls[0][0] as { pathname: string; params: { sessionId: string } };
  expect(route.pathname).toBe('/result');
  expect(Object.keys(route.params)).toEqual(['sessionId']);
  expect(getSession(route.params.sessionId)?.text).toBe('https://gcash-verify.xyz/login');
  const rescan = screen.root
    .findAllByType(Button)
    .find((button) => button.props.testID === 'qr-rescan')!;
  await act(() => rescan.props.onPress());
  expect(getSession(route.params.sessionId)).toBeUndefined();
  expect(screen.root.findAllByProps({ testID: 'qr-camera' }).length).toBeGreaterThan(0);
});
test('camera is absent while its screen is unfocused or backgrounded', async () => {
  jest.mocked(useAppActive).mockReturnValue(false);
  await act(() => {
    screen = create(<QrScreen />);
  });
  expect(screen.root.findAllByProps({ testID: 'qr-camera' })).toHaveLength(0);
});

test('image decoding failure clears loading, deletes the copy, and allows a retry', async () => {
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: false, canAskAgain: true },
      requestPermission,
      jest.fn(),
    ] as unknown as ReturnType<typeof useCameraPermissions>);
  jest.mocked(pickImage).mockResolvedValue('file:///app/cache/qr.image');
  let rejectDecode!: (error: Error) => void;
  jest.mocked(decodeQrImage).mockReturnValue(
    new Promise((_, reject) => {
      rejectDecode = reject;
    }),
  );
  await act(() => {
    screen = create(<QrScreen />);
  });
  const button = (id: string) =>
    screen.root.findAllByType(Button).find((item) => item.props.testID === id)!;
  let picking!: Promise<void>;
  await act(async () => {
    picking = button('qr-pick-image').props.onPress();
  });
  expect(button('qr-pick-image').props.busy).toBe(true);
  expect(button('qr-enable-camera').props.busy).toBe(false);
  expect(button('qr-enable-camera').props.disabled).toBe(true);
  await act(async () => {
    rejectDecode(new Error('Image processing took too long.'));
    await picking;
  });
  expect(button('qr-pick-image').props.busy).toBe(false);
  expect(deleteTemporaryImage).toHaveBeenCalledWith('file:///app/cache/qr.image');
  jest.mocked(decodeQrImage).mockResolvedValue('https://example.com/check');
  await act(async () => {
    await button('qr-pick-image').props.onPress();
  });
  expect(screen.root.findAllByProps({ testID: 'qr-preview' }).length).toBeGreaterThan(0);
});

test('a missing permission callback times out and unlocks image selection', async () => {
  jest.useFakeTimers();
  requestPermission.mockReturnValue(new Promise(() => {}));
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: false, canAskAgain: true },
      requestPermission,
      jest.fn(),
    ] as unknown as ReturnType<typeof useCameraPermissions>);
  await act(() => {
    screen = create(<QrScreen />);
  });
  const button = (id: string) =>
    screen.root.findAllByType(Button).find((item) => item.props.testID === id)!;
  await act(() => {
    button('qr-enable-camera').props.onPress();
  });
  expect(button('qr-enable-camera').props.busy).toBe(true);
  expect(button('qr-pick-image').props.busy).toBe(false);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(30000);
  });
  expect(button('qr-enable-camera').props.busy).toBe(false);
  expect(button('qr-pick-image').props.disabled).toBe(false);
});
