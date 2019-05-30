'use strict';

import PropTypes from 'prop-types'
import Message from './Message';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard'
// var GiftedSpinner = require('react-native-gifted-spinner');
import {
  Text,
  View,
  ListView,
  TextInput,
  Dimensions,
  Animated,
  ActivityIndicator,
  Image,
  TouchableHighlight,
  Platform,
  PixelRatio
} from 'react-native'
var PULLDOWN_DISTANCE = Platform.select({
      ios: -40,
      android: 0,
      web: 1
    })

import React, { Component } from 'react'
import shallowequal from 'shallowequal'
import autobind from 'autobind-decorator'

var moment = require('moment');

var Button = require('react-native-button');

class GiftedMessenger extends Component {

  firstDisplay = true
  listHeight = 0
  footerY = 0

  constructor(props) {
    super(props)

    this._data = [];
    this._rowIds = [];

    var textInputHeight = 0;
    if (this.props.hideTextInput === false) {
      textInputHeight = this.props.textInputHeight;
    }

    this.listViewMaxHeight = this.props.maxHeight - textInputHeight;

    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => {
      // // if (typeof r1.status !== 'undefined') {
      // //   return true;
      // // }
      // if (r1 === r2) //  &&  (this.props.messageSent  &&  r1 === this.props.messageSent))
      //   return true
      // // HACK to force update of the rows in chat when formRequest was added to eliminate FR with the same form
      // // if (this.props.addedItem)
      // //   return true
      return !shallowequal(r1, r2)
      // // return r1 !== r2;
    }});

    this.state = {
      dataSource: ds.cloneWithRows([]),
      text: '',
      disabled: true,
      height: new Animated.Value(this.listViewMaxHeight),
      isLoadingEarlierMessages: false,
      allLoaded: false,
      appearAnim: new Animated.Value(0),
      menuButtonShow: true
    }
  };

  static defaultProps = {
    displayNames: true,
    placeholder: 'Type a message...',
    styles: {},
    autoFocus: true,
    onErrorButtonPress: (message, rowID) => {},
    loadEarlierMessagesButton: false,
    loadEarlierMessagesButtonText: 'Load earlier messages',
    onLoadEarlierMessages: (oldestMessage, callback) => {},
    parseText: false,
    handleUrlPress: (url) => {},
    handlePhonePress: (phone) => {},
    handleEmailPress: (email) => {},
    initialMessages: [],
    messages: [],
    handleSend: (message, rowID) => {},
    maxHeight: Dimensions.get('window').height,
    senderName: 'Sender',
    senderImage: null,
    sendButtonText: 'Send',
    onImagePress: null,
    hideTextInput: false,
    submitOnReturn: false,
    underlineColorAndroid: 'transparent',
    forceRenderImage: false,
    onChangeText: (text) => {},
    initialListSize: 10,
    pageSize: 10
  };

  static propTypes = {
    displayNames: PropTypes.bool,
    placeholder: PropTypes.string,
    styles: PropTypes.object,
    autoFocus: PropTypes.bool,
    onErrorButtonPress: PropTypes.func,
    loadEarlierMessagesButton: PropTypes.bool,
    loadEarlierMessagesButtonText: PropTypes.string,
    onLoadEarlierMessages: PropTypes.func,
    parseText: PropTypes.bool,
    handleUrlPress: PropTypes.func,
    handlePhonePress: PropTypes.func,
    handleEmailPress: PropTypes.func,
    initialMessages: PropTypes.array,
    messages: PropTypes.array,
    handleSend: PropTypes.func,
    onCustomSend: PropTypes.func,
    renderCustomText: PropTypes.func,
    renderCustomMessage: PropTypes.func,
    maxHeight: PropTypes.number,
    senderName: PropTypes.string,
    senderImage: PropTypes.object,
    sendButtonText: PropTypes.string,
    onImagePress: PropTypes.func,
    hideTextInput: PropTypes.bool,
    underlineColorAndroid: PropTypes.string,
    forceRenderImage: PropTypes.bool,
    onChangeText: PropTypes.func,
    menu: PropTypes.func,
  };

  shouldComponentUpdate(nextProps, nextState) {
    // Case when the 'no network' banner is displayed
    if (this.props.maxHeight !== nextProps.maxHeight) {
      var textInputHeight = 0;
      if (nextProps.hideTextInput === false)
        textInputHeight = nextProps.textInputHeight;

      this.listViewMaxHeight = nextProps.maxHeight - textInputHeight;
      nextState.height = new Animated.Value(this.listViewMaxHeight)
    }
    if (!shallowequal(this.props, nextProps))
      return true;

    if (!shallowequal(this.state, nextState))
      return true;

    return false
  }

  getMessage(rowID) {
    if (typeof this._rowIds[this._rowIds.indexOf(rowID)] !== 'undefined') {
      if (typeof this._data[this._rowIds[this._rowIds.indexOf(rowID)]] !== 'undefined') {
        return this._data[this._rowIds[this._rowIds.indexOf(rowID)]];
      }
    }
    return null;
  }

  getPreviousMessage(rowID) {
    if (typeof this._rowIds[this._rowIds.indexOf(rowID - 1)] !== 'undefined') {
      if (typeof this._data[this._rowIds[this._rowIds.indexOf(rowID - 1)]] !== 'undefined') {
        return this._data[this._rowIds[this._rowIds.indexOf(rowID - 1)]];
      }
    }
    return null;
  }

  getNextMessage(rowID) {
    if (typeof this._rowIds[this._rowIds.indexOf(rowID + 1)] !== 'undefined') {
      if (typeof this._data[this._rowIds[this._rowIds.indexOf(rowID + 1)]] !== 'undefined') {
        return this._data[this._rowIds[this._rowIds.indexOf(rowID + 1)]];
      }
    }
    return null;
  }

  renderDate(rowData = {}, rowID = null) {
    var diffMessage = null;
    if (rowData.isOld === true) {
      diffMessage = this.getPreviousMessage(rowID);
    } else {
      diffMessage = this.getNextMessage(rowID);
    }
    if (rowData.date instanceof Date) {
      if (diffMessage === null) {
        return (
          <Text style={[this.styles.date]}>
            {moment(rowData.date).calendar()}
          </Text>
        );
      } else if (diffMessage.date instanceof Date) {
        let diff = moment(rowData.date).diff(moment(diffMessage.date), 'minutes');
        if (diff > 5) {
          return (
            <Text style={[this.styles.date]}>
              {moment(rowData.date).calendar()}
            </Text>
          );
        }
      }
    }
    return null;
  }

  renderRow(rowData = {}, sectionID = null, rowID = null) {
    if (this.props.renderCustomMessage) {
      return this.props.renderCustomMessage(rowData, sectionID, rowID)
    }

    var diffMessage = null;
    if (rowData.isOld === true) {
      diffMessage = this.getPreviousMessage(rowID);
    } else {
      diffMessage = this.getNextMessage(rowID);
    }

    return (
      <View>
        {this.renderDate(rowData, rowID)}
        <Message
          rowData={rowData}
          rowID={rowID}
          onErrorButtonPress={this.props.onErrorButtonPress}
          displayNames={this.props.displayNames}
          diffMessage={diffMessage}
          position={rowData.position}
          forceRenderImage={this.props.forceRenderImage}
          onImagePress={this.props.onImagePress}
          renderCustomText={this.props.renderCustomText}

          styles={this.styles}
        />
      </View>
    )
  }

  onChangeText(text) {
    this.setState({
      text: text
    })
    if (text.trim().length > 0) {
      this.setState({
        disabled: false
      })
    } else {
      this.setState({
        disabled: true
      })
    }

    this.props.onChangeText(text);
  }

  componentDidMount() {
    this.scrollResponder = this._listView.getScrollResponder();

    if (this.props.messages.length > 0) {
      this.appendMessages(this.props.messages);
    } else if (this.props.initialMessages.length > 0) {
      this.appendMessages(this.props.initialMessages);
    } else {
      this.setState({
        allLoaded: true
      });
    }

  }

  componentWillReceiveProps(nextProps) {
    this._data = [];
    this._rowIds = [];
    this.appendMessages(nextProps.messages);
  }

  onKeyboardWillHide(e) {
    Animated.timing(this.state.height, {
      toValue: this.listViewMaxHeight,
      duration: 150,
    }).start();
  }

  onKeyboardWillShow(e) {
    Animated.timing(this.state.height, {
      toValue: this.listViewMaxHeight - (e.endCoordinates ? e.endCoordinates.height : e.end.height),
      duration: 200,
    }).start();
  }
  // For android
  onKeyboardDidShow(e) {
    this.scrollToBottom();
    this.setState({menuButtonShow: false})
    if (Platform.OS === 'android')
      this.onKeyboardWillShow(e)
  }
  onKeyboardDidHide(e) {
    this.scrollToBottom();
    this.setState({menuButtonShow: true})
    if (Platform.OS === 'android')
      this.onKeyboardWillHide(e)
  }
  // onKeyboardDidShow(e) {
  //   this.scrollToBottom();
  // },
  // onKeyboardDidHide(e) {
  //   this.scrollToBottom();
  // },

  scrollToBottom() {
    if (this.listHeight && this.footerY && this.footerY > this.listHeight) {
      var scrollDistance = this.listHeight - this.footerY;
      this.scrollResponder.scrollTo({ y: -scrollDistance, animated: true });
    }
  }

  scrollWithoutAnimationToBottom() {
    if (this.listHeight && this.footerY && this.footerY > this.listHeight) {
      var scrollDistance = this.listHeight - this.footerY;
      this.scrollResponder.scrollTo({ y: -scrollDistance, animated: false });
    }
  }

  onSend() {
    if (Platform.OS === 'android') {
      dismissKeyboard()
      this.onKeyboardDidHide()
    }
    this.props.handleSend(this.state.text.trim());
    this.onChangeText('');
    this.scrollWithoutAnimationToBottom()
  }

  postLoadEarlierMessages(messages = [], allLoaded = false) {
    this.prependMessages(messages);
    this.setState({
      isLoadingEarlierMessages: false
    });
    if (allLoaded === true) {
      this.setState({
        allLoaded: true,
      });
    }
  }

  preLoadEarlierMessages() {
    this.setState({
      isLoadingEarlierMessages: true
    });
    this.props.onLoadEarlierMessages(this._data[this._rowIds[this._rowIds.length - 1]], this.postLoadEarlierMessages);
  }

  renderLoadEarlierMessages() {
    if (this.props.loadEarlierMessagesButton === true) {
      if (this.state.allLoaded === false) {
        if (this.state.isLoadingEarlierMessages === true) {
          return (
            <View style={this.styles.loadEarlierMessages}>
              <ActivityIndicator />
            </View>
          );
        }
      }
    }
    return null;
  }
          // return (
          //   <View style={this.styles.loadEarlierMessages}>
          //     <Button
          //       style={this.styles.loadEarlierMessagesButton}
          //       onPress={() => {this.preLoadEarlierMessages()}}
          //     >
          //       {this.props.loadEarlierMessagesButtonText}
          //     </Button>
          //     <ActivityIndicator/>
          //   </View>
          // );

  prependMessages(messages = []) {
    var rowID = null;
    for (let i = 0; i < messages.length; i++) {
      this._data.push(messages[i]);
      this._rowIds.unshift(this._data.length - 1);
      rowID = this._data.length - 1;
    }
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(this._data, this._rowIds),
    });
    return rowID;
  }

  prependMessage(message = {}) {
    var rowID = this.prependMessages([message]);
    return rowID;
  }

  appendMessages(messages = []) {
    var rowID = null;
    for (let i = 0; i < messages.length; i++) {
      messages[i].isOld = true;
      this._data.push(messages[i]);
      this._rowIds.push(this._data.length - 1);
      rowID = this._data.length - 1;
    }

    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(this._data, this._rowIds),
    });

    return rowID;
  }

  appendMessage(message = {}, scrollToBottom = true) {
    var rowID = this.appendMessages([message]);

    if (scrollToBottom === true) {
      setTimeout(() => {
        // inspired by http://stackoverflow.com/a/34838513/1385109
        this.scrollToBottom();
      }, (Platform.OS === 'android' ? 200 : 100));
    }

    return rowID;
  }

  refreshRows() {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(this._data, this._rowIds),
    });
  }

  setMessageStatus(status = '', rowID) {
    if (status === 'ErrorButton') {
      if (this._data[rowID].position === 'right') {
        this._data[rowID].status = 'ErrorButton';
        this.refreshRows();
      }
    } else {
      if (this._data[rowID].position === 'right') {
        this._data[rowID].status = status;

        // only 1 message can have a status
        for (let i = 0; i < this._data.length; i++) {
          if (i !== rowID && this._data[i].status !== 'ErrorButton') {
            this._data[i].status = '';
          }
        }
        this.refreshRows();
      }
    }
  }

  _setListViewRef = ref => {
    if (ref) {
      this._listView = ref
    }
  }

  renderAnimatedView() {
    return (
      <Animated.View
        style={{
          height: this.state.height,
        }}

      >
        <ListView
          ref={this._setListViewRef}
          dataSource={this.state.dataSource}
          renderRow={this.renderRow}
          renderHeader={this.renderLoadEarlierMessages}
          onLayout={(event) => {
            var layout = event.nativeEvent.layout;
            this.listHeight = layout.height;
            if (this.firstDisplay === true) {
              requestAnimationFrame(() => {
                this.firstDisplay = false;
                this.scrollWithoutAnimationToBottom();
              });
            }

          }}
          removeClippedSubviews={false}
          renderFooter={() => {
            return <View onLayout={(event)=>{
              var layout = event.nativeEvent.layout;
              let isNull = !this.footerY
              this.footerY = layout.y;
              if (isNull)
                this.scrollToBottom()
            }}></View>
          }}

          style={this.styles.listView}


          // not working android RN 0.14.2
          onKeyboardWillShow={this.onKeyboardWillShow}
          onKeyboardWillHide={this.onKeyboardWillHide}

          onKeyboardDidShow={this.onKeyboardDidShow}
          onKeyboardDidHide={this.onKeyboardDidHide}

          /*
            keyboardShouldPersistTaps={false} // @issue keyboardShouldPersistTaps={false} + textInput focused = 2 taps are needed to trigger the ParsedText links
            keyboardDismissMode='interactive'
          */
          onScroll={this.handleScroll}
          keyboardShouldPersistTaps={typeof this.props.keyboardShouldPersistTaps === 'undefined' ? true : this.props.keyboardShouldPersistTaps}
          keyboardDismissMode={this.props.keyboardDismissMode || 'interactive'}


          initialListSize={this.props.initialListSize}
          pageSize={this.props.pageSize}


          {...this.props}
        />

      </Animated.View>
    );
  }
  handleScroll(e) {
    if (this._listView.scrollProperties.offset <= PULLDOWN_DISTANCE  &&  !this.state.isLoadingEarlierMessages) {
      this.preLoadEarlierMessages()
    }
    if (Platform.OS !== 'android'  ||  this.state.menuButtonShow)
      return
    const { navigator } = this.props
    if (!navigator)
      return
    const routes = navigator.getCurrentRoutes()
    // HACK: the scroll event is propagated from NewResource component
    // that is pushed on top of Chat component and causes keyboard dismissal
    // in a wrong component
    if (routes[routes.length - 1].componentName === 'MessageList') {
      dismissKeyboard()
      this.onKeyboardDidHide()
    }
  }

  render() {
    return (
      <View
        style={this.styles.container}
        ref='container'
      >
        {this.renderAnimatedView()}
        {this.renderTextInput()}
      </View>
    )
  }

  renderTextInput() {
    if (this.props.hideTextInput === false) {
      return (
        <View style={this.styles.textInputContainer}>
          <TextInput
            style={this.styles.textInput}
            placeholder={this.props.placeholder}
            ref='textInput'
            onChangeText={this.onChangeText}
            value={this.state.text}
            underlineColorAndroid={this.props.underlineColorAndroid}
            autoFocus={this.props.autoFocus}
            returnKeyType={this.props.submitOnReturn ? 'send' : 'default'}
            onSubmitEditing={this.props.submitOnReturn ? this.onSend : null}
            blurOnSubmit={false}
          />
          {this.props.menu(this.state.menuButtonShow)}
        </View>
      );
    }
          // <Button
          //   style={this.styles.sendButton}
          //   onPress={this.onSend}
          //   disabled={this.state.disabled}
          // >
          //   {this.props.sendButtonText}
          // </Button>
    return null;
  }

  componentWillMount() {
    this.styles = {
      container: {
        flex: 1,
      },
      listView: {
        flex: 1,
      },
      textInputContainer: {
        height: this.props.textInputHeight,
        borderTopWidth: Platform.OS === 'android' ? 1 : 1 / PixelRatio.get(),
        borderColor: '#b2b2b2',
        flexDirection: 'row',
        paddingLeft: 10,
        paddingRight: 10,
      },
      textInput: {
        alignSelf: 'center',
        height: 30,
        width: 100,
        backgroundColor: 'transparent',
        flex: 1,
        padding: 0,
        margin: 0,
        marginTop: Platform.OS === 'web' ? 5 : -5,
        fontSize: 17,
      },
      sendButton: {
        marginTop: 11,
        marginLeft: 10,
      },
      date: {
        color: '#aaaaaa',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
      },
      link: {
        // color: '#007aff',
        textDecorationLine: 'underline',
      },
      linkLeft: {
        color: '#000',
      },
      linkRight: {
        color: '#fff',
      },
      loadEarlierMessages: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eeeeee'
      },
      loadEarlierMessagesButton: {
        fontSize: 14,
      },
    };

    Object.assign(this.styles, this.props.styles);
  }
}

module.exports = autobind(GiftedMessenger);
